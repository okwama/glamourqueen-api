const prisma = require('../lib/prisma');

const salesController = {
  createSale: async (req, res) => {
    try {
      // Validate request body
      if (!req.body.sale) {
        return res.status(400).json({ error: 'Sale data is required' });
      }

      const { productId, quantity, unitPrice, total, clientId } = req.body.sale;
      
      // Validate required fields
      if (!productId) return res.status(400).json({ error: 'Product ID is required' });
      if (!quantity) return res.status(400).json({ error: 'Quantity is required' });
      if (!unitPrice) return res.status(400).json({ error: 'Unit price is required' });
      if (!total) return res.status(400).json({ error: 'Total is required' });
      if (!clientId) return res.status(400).json({ error: 'Client ID is required' });
      if (!req.user?.id) return res.status(401).json({ error: 'User authentication required' });

      // Check if product exists
      const product = await prisma.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if client exists
      const client = await prisma.clients.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      // Check outlet quantity
      const outletQuantity = await prisma.outletQuantity.findFirst({
        where: {
          clientId: clientId,
          productId: productId
        }
      });

      if (!outletQuantity) {
        return res.status(400).json({ error: 'Product not available at this outlet' });
      }

      if (outletQuantity.quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient quantity at outlet' });
      }

      // Create sale and update outlet quantity in a transaction
      const result = await prisma.$transaction([
        // Create sale
        prisma.sale.create({
          data: {
            productId,
            quantity,
            unitPrice,
            total,
            clientId,
            createdBy: req.user.id,
            status: 'pending',
            isLocked: false,
          },
          include: {
            product: true,
            client: true,
          },
        }),
        // Update outlet quantity
        prisma.outletQuantity.update({
          where: {
            id: outletQuantity.id
          },
          data: {
            quantity: {
              decrement: quantity
            }
          }
        })
      ]);

      console.log('Sale created successfully:', result[0]);
      res.status(201).json(result[0]);
    } catch (error) {
      console.error('Error creating sale:', error);
      res.status(500).json({ 
        error: 'Failed to create sale',
        details: error.message 
      });
    }
  },

  getSales: async (req, res) => {
    try {
      console.log('Fetching sales for user:', req.user);
      
      const sales = await prisma.sale.findMany({
        include: {
          product: true,
          client: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      console.log('Successfully fetched sales:', sales.length);
      res.json(sales);
    } catch (error) {
      console.error('Error in getSales:', error);
      res.status(500).json({ 
        error: 'Failed to fetch sales',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  },

  getSalesSummary: async (req, res) => {
    try {
      const totalSales = await prisma.sale.aggregate({
        _sum: {
          total: true,
        },
      });

      const salesByStatus = await prisma.sale.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      });

      res.json({
        totalSales: totalSales._sum.total || 0,
        salesByStatus,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getSaleDetails: async (req, res) => {
    try {
      const { id } = req.params;
      const sale = await prisma.sale.findUnique({
        where: { id: parseInt(id) },
        include: {
          product: true,
          client: true,
        },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      res.json(sale);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateSaleStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const sale = await prisma.sale.findUnique({
        where: { id: parseInt(id) },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      if (sale.isLocked) {
        return res.status(403).json({ error: 'Sale is locked and cannot be modified' });
      }

      const updatedSale = await prisma.sale.update({
        where: { id: parseInt(id) },
        data: { status },
        include: {
          product: true,
          client: true,
        },
      });

      res.json(updatedSale);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  lockSale: async (req, res) => {
    try {
      const { id } = req.params;

      const sale = await prisma.sale.findUnique({
        where: { id: parseInt(id) },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      // Only allow locking if user is admin or created the sale
      if (req.user.role !== 'admin' && sale.createdBy !== req.user.id) {
        return res.status(403).json({ error: 'Not authorized to lock this sale' });
      }

      const updatedSale = await prisma.sale.update({
        where: { id: parseInt(id) },
        data: { isLocked: true },
        include: {
          product: true,
          client: true,
        },
      });

      res.json(updatedSale);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  requestVoid: async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Find the sale
      const sale = await prisma.sale.findUnique({
        where: { id: parseInt(id) },
        include: {
          product: true,
          client: true,
        },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      // Check if sale is already voided or has a pending request
      if (sale.voidStatus === 'approved' || sale.voidRequest) {
        return res.status(400).json({ error: 'Sale already has a void request or is voided' });
      }

      // Update sale with void request
      const updatedSale = await prisma.sale.update({
        where: { id: parseInt(id) },
        data: {
          voidRequest: true,
          voidStatus: 'pending',
        },
        include: {
          product: true,
          client: true,
        },
      });

      // Here you could add logic to notify admins about the void request
      // For example, send an email or create a notification

      res.json(updatedSale);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = salesController; 
