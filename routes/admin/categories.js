const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const { generateSlug } = require('../../utils/helpers');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get all categories (admin view)
router.get('/', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) {
      console.error('Get categories error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch categories'
      });
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories'
    });
  }
});

// Create category
router.post('/', async (req, res) => {
  try {
    const { name, description, icon } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    const slug = generateSlug(name);

    // Check if category exists
    const { data: existing, error: checkError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Category already exists'
      });
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert([
        {
          name,
          slug,
          description: description || '',
          icon: icon || null,
          is_active: true
        }
      ])
      .select('*')
      .single();

    if (error) {
      console.error('Create category error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create category'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
});

// Update category
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, is_active } = req.body;

    const updates = {};
    if (name) {
      updates.name = name;
      updates.slug = generateSlug(name);
    }
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data: category, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
});

// Delete category (only if not in use)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category is in use
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (countError) {
      console.error('Check category usage error:', countError);
      return res.status(500).json({
        success: false,
        message: 'Failed to check category usage'
      });
    }

    if (count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category that is in use by products'
      });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete category error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete category'
      });
    }

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
});

module.exports = router;
