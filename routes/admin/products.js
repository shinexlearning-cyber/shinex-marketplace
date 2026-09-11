const express = require('express');
const { supabase } = require('../../supabase/client');
const authMiddleware = require('../../middleware/auth');
const adminMiddleware = require('../../middleware/admin');
const { getPagination } = require('../../utils/helpers');
const { deleteImage } = require('../../services/cloudinary');
const router = express.Router();

router.use(authMiddleware, adminMiddleware);

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      category, 
      seller, 
      page = 1, 
      limit = 20,
      status,
      min_price,
      max_price
    } = req.query;
    const { offset, limit: pageLimit } = getPagination(page, limit);

    let query = supabase
      .from('products')
      .select(`
        *,
        user:users(id, username, full_name, email, phone),
        category:categories(id, name),
        images:product_images(*)
      `, { count: 'exact' });

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    if (seller) {
      query = query.eq('user_id', seller);
    }

    if (min_price) {
      query = query.gte('price', parseFloat(min_price));
    }

    if (max_price) {
      query = query.lte('price', parseFloat(max_price));
    }

    if (status === 'active' || status === 'approved') {
      query = query.eq('is_active', true).in('listing_status',['approved','active']);
    } else if (status === 'pending' || status === 'rejected' || status === 'archived' || status === 'draft') {
      query = query.eq('listing_status', status);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    } else if (status === 'sold') {
      query = query.eq('is_sold', true);
    }

    const { data: products, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageLimit - 1);

    if (error) {
      console.error('Get admin products error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch products'
      });
    }

    // Format products with primary image
    const formattedProducts = (products || []).map(product => ({
      ...product,
      primary_image: product.images?.find(img => img.is_primary)?.image_url || 
                     product.images?.[0]?.image_url || null
    }));

    res.json({
      success: true,
      data: formattedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(pageLimit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageLimit)
      }
    });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch products'
    });
  }
});

// Get single product (admin view)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        user:users(id, username, full_name, email, phone, bio, location, avatar_url),
        category:categories(id, name, slug),
        images:product_images(*)
      `)
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get admin product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product'
    });
  }
});

// Approve product
router.patch('/:id/approve', async (req, res) => {
  try {
    const { data: product, error } = await supabase.from('products').select('id,user_id,name').eq('id', req.params.id).single();
    if (error || !product) return res.status(404).json({ success:false,message:'Product not found' });
    const { data, error: updateError } = await supabase.from('products').update({ listing_status:'approved', is_active:true, rejection_reason:null, approved_at:new Date().toISOString(), approved_by:req.user.id }).eq('id',req.params.id).select('*').single();
    if (updateError) {
      if (updateError.message === 'LISTING_LIMIT_REACHED') return res.status(409).json({success:false,error_code:'LISTING_LIMIT_REACHED',message:'Seller has reached their subscription listing limit.'});
      return res.status(400).json({success:false,message:'Failed to approve product'});
    }
    await supabase.rpc('create_shinex_notification',{p_user_id:product.user_id,p_type:'listing_approved',p_title:'Listing approved',p_message:`Your listing "${product.name}" is now public.`,p_data:{product_id:product.id}}).catch(()=>{});
    res.json({success:true,message:'Product approved',data});
  } catch(e){console.error(e);res.status(500).json({success:false,message:'Failed to approve product'});}
});

// Reject product
router.patch('/:id/reject', async (req, res) => {
  try {
    const reason = String(req.body?.reason || 'Listing did not meet SHINEX marketplace requirements.').trim();
    const { data: product, error } = await supabase.from('products').select('id,user_id,name').eq('id', req.params.id).single();
    if (error || !product) return res.status(404).json({success:false,message:'Product not found'});
    const { data, error: updateError } = await supabase.from('products').update({listing_status:'rejected',is_active:false,rejection_reason:reason}).eq('id',req.params.id).select('*').single();
    if (updateError) return res.status(400).json({success:false,message:'Failed to reject product'});
    await supabase.rpc('create_shinex_notification',{p_user_id:product.user_id,p_type:'listing_rejected',p_title:'Listing rejected',p_message:`Your listing "${product.name}" was rejected. Reason: ${reason}`,p_data:{product_id:product.id,reason}}).catch(()=>{});
    res.json({success:true,message:'Product rejected',data});
  } catch(e){console.error(e);res.status(500).json({success:false,message:'Failed to reject product'});}
});

// Restore an archived listing; database trigger enforces the current plan limit.
router.patch('/:id/restore', async (req, res) => {
  try {
    const {data,error}=await supabase.from('products').update({listing_status:'approved',is_active:true,archived_at:null,archived_reason:null}).eq('id',req.params.id).eq('listing_status','archived').select('*').single();
    if(error){if(error.message==='LISTING_LIMIT_REACHED')return res.status(409).json({success:false,error_code:'LISTING_LIMIT_REACHED',message:'Current subscription limit has been reached.'});return res.status(404).json({success:false,message:'Archived listing not found'});}
    res.json({success:true,message:'Listing restored',data});
  }catch(e){console.error(e);res.status(500).json({success:false,message:'Failed to restore listing'});}
});

// Delete product (admin)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get product images
    const { data: images } = await supabase
      .from('product_images')
      .select('image_public_id')
      .eq('product_id', id);

    // Delete images from Cloudinary
    if (images && images.length > 0) {
      await Promise.all(
        images.map(img => deleteImage(img.image_public_id))
      );
    }

    // Delete product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Admin delete product error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete product'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
});

module.exports = router;
