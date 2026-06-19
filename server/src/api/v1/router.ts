import { Router } from 'express';
import authRoutes from '../routes/auth';
import supplierRoutes from '../routes/suppliers';
import branchRoutes from '../routes/branches';
import itemRoutes from '../routes/items';
import trusteeRoutes from '../routes/trustees';
import deliveryRoutes from '../routes/deliveries';
import inventoryRoutes from '../routes/inventory';
import orderRulesRoutes from '../routes/orderRules';
import paymentsRoutes from '../routes/payments';
import legacyRoutes from '../routes/legacy';

const router = Router();

router.use('/auth', authRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/branches', branchRoutes);
router.use('/items', itemRoutes);
router.use('/trustees', trusteeRoutes);

// Public + admin delivery routes under /deliveries
router.use('/deliveries', deliveryRoutes);
router.use('/files', (req, res) => {
  res.redirect(`/api/v1/deliveries/files/${req.path}`);
});

router.use('/inventory', inventoryRoutes);
router.use('/order-rules', orderRulesRoutes);
router.use('/payments', paymentsRoutes);
router.use('/legacy', legacyRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;
