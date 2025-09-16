// src/routes/ingredients.ts
import { Router } from 'express';
import {
  ingredientsLookup,
  pingIngredients,
} from '@/controllers/ingredientsController';

const router = Router();

router.get('/ping', pingIngredients);
router.get('/lookup', ingredientsLookup);

export default router;
