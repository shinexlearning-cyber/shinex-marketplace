const jwt=require('jsonwebtoken');
const {supabase}=require('../supabase/client');
module.exports=async function optionalAuth(req,res,next){
 try{const h=req.headers.authorization;if(!h||!h.startsWith('Bearer ')) return next();const decoded=jwt.verify(h.slice(7),process.env.JWT_SECRET);const {data:user}=await supabase.from('users').select('id,username,email,full_name,phone,avatar_url,is_admin,is_suspended').eq('id',decoded.id).maybeSingle();if(user&&!user.is_suspended)req.user=user;next();}catch(e){next();}
};
