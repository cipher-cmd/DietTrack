// src/controllers/ingredientsController.ts
import { Request, Response } from 'express';
import { lookupIngredientsByName } from '@/services/ingredientService';

export async function pingIngredients(_req: Request, res: Response) {
  res.json({ success: true, data: { ok: true, route: 'ingredients' } });
}

export async function ingredientsLookup(req: Request, res: Response) {
  const name =
    (req.query.name as string) ||
    (req.query.q as string) ||
    (req.query.term as string) ||
    '';

  const limit = Number(req.query.limit || 8);

  if (!name || !name.trim()) {
    return res
      .status(400)
      .json({ success: false, error: 'name (or q) is required' });
  }

  const { matches, error } = await lookupIngredientsByName(name.trim(), limit);
  if (error) {
    return res
      .status(500)
      .json({ success: false, error: error.message || 'Lookup failed' });
  }

  return res.json({ success: true, data: { matches } });
}
