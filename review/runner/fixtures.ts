import readonlyAdmin from './readonly-admin-fixture.json';
// Only this review runner imports these fixtures. Production modules do not.
// Names and images originate in the existing discovery/pickup test fixtures.
export const fixtureCalls: {kind:string;name:string}[]=[];(window as any).__fixtureCalls=fixtureCalls;
export const fixtureNotice='Isolated local fixture data. No orders, payments or messages are sent.';
const params=new URLSearchParams(location.search);
export const state=params.get('state')||'populated';
export const scheme=params.get('theme')==='dark'?'dark':'light';
export const mode=params.get('mode')==='business'?'business':'customer';
export const session=params.get('user')==='guest'?null:{user:{id:'fixture-customer',email:'fixture@example.test',identities:[],app_metadata:{},user_metadata:{display_name:'Local review customer'}},access_token:'LOCAL_FIXTURE_ONLY'};
export const photos=[{id:'cover',business_id:'cafe',role:'cover',caption:'Local review photography',media_assets:{storage_path:'/fixture-assets/cafe.jpg',status:'ready',alt_text:'Cafe interior from existing test fixture',width:1200,height:800}},{id:'logo',business_id:'cafe',role:'logo',caption:null,media_assets:{storage_path:'/fixture-assets/cafe.svg',status:'ready',alt_text:'Bayou and Bloom local test fixture logo',width:128,height:128}}];
export const business={id:'cafe',name:'Bayou & Bloom Cafe',slug:'bayou-bloom',status:'active',owner_id:'fixture-customer',business_type:'food_drink',review_feedback:null,service_area_type:'at_location',service_area_regions:[],service_radius_miles:null,page_theme:'light',font_pair:'modern_sans',button_style:'rounded',description:'Coffee, brunch and pastries. A local discovery test fixture.',category_summary:'Coffee, brunch, pastries',offering_search_text:'Breakfast biscuit, half muffuletta sandwich, seasonal latte',city:'Hammond',region_code:'LA',postal_code:'70401',address_line_1:'Main Street pickup',address_line_2:null,phone:null,email:null,website_url:null,service_area:null,timezone:'America/Chicago',primary_color:'#305747',accent_color:'#E9B65A',created_at:'2026-01-01T00:00:00Z',business_photos:photos,loyalty_programs:[{id:'program',is_active:true}],has_active_rewards:true,reviewSummary:{averageRating:4.9,reviewCount:128}};
export const businesses=[business,{...business,id:'kitchen',name:'Cane & Clove Kitchen',slug:'cane-clove',category_summary:'Southern plates, seasonal cocktails, dessert',primary_color:'#783E2D',loyalty_programs:[],business_photos:[{...photos[0],business_id:'kitchen',media_assets:{...photos[0].media_assets,storage_path:'/fixture-assets/kitchen.jpg'}}]},{...business,id:'services',slug:'cypress-home',name:'Cypress & Co Home Care',business_type:'services',category_summary:'Home services, repairs, maintenance',primary_color:'#294859',loyalty_programs:[],business_photos:[{...photos[0],business_id:'services',media_assets:{...photos[0].media_assets,storage_path:'/fixture-assets/services.jpg'}}]}];
export const product={id:'coffee',name:'Seasonal coffee with oat milk',variation:'Large',description:'Freshly brewed coffee with your choice of milk.',category:'Coffee & tea',image:'https://local-fixture.invalid/fixture-assets/coffee.jpg',price:500,currency:'USD',available:true,groups:[{id:'milk',name:'Milk choice',min:1,max:1,modifiers:[{id:'oat',name:'Oat milk',price:50},{id:'dairy',name:'Whole milk',price:0}]}]};
export const products=[product,{...product,id:'margherita',name:'Margherita pizza',description:'Tomato, fresh mozzarella, basil and olive oil.',category:'House specialties',variation:'Regular',price:1400,image:'https://local-fixture.invalid/fixture-assets/biscuit.jpg',groups:[]},{...product,id:'sandwich',name:'Half muffuletta sandwich',description:'A savory lunch choice from the local discovery fixture.',category:'Lunch',variation:'Regular',price:950,image:null,groups:[]}];
export const slot={at:'2026-10-06T16:30:00Z',stopId:null,title:'Main Street pickup',address:'Main Street pickup, Hammond, Louisiana',timezone:'America/Chicago'};
export const order={id:'fixture',number:'S-FIXTURE',businessId:'cafe',businessName:business.name,status:'preparing',provider:'stripe',version:1,pickupAt:slot.at,timezone:slot.timezone,address:slot.address,subtotal:1100,tax:110,tip:0,total:1210,currency:'USD',createdAt:'2026-10-06T16:00:00Z',expiresAt:'2026-10-06T16:25:00Z',checkoutUrl:null,items:[{name:product.name,quantity:'2',variation_name:'Large',modifiers:[{name:'Oat milk'}],total_money:{amount:1100,currency:'USD'}}]};
export const quote={quoteId:'fixture-quote',expiresAt:'2026-10-06T17:00:00Z',slot,subtotal:1100,tax:110,tip:0,total:1210,currency:'USD'};
// Explicit visual stress cases affect only this local review fixture.
const visualCase=params.get('case');
if(visualCase==='long-name')business.name='Bayou & Bloom Cafe — Coffee, Brunch & Pastries on Main Street';
if(visualCase==='no-logo')business.business_photos=photos.filter(p=>p.role!=='logo');
if(visualCase==='broken-cover')business.business_photos=photos.map(p=>p.role==='cover'?{...p,media_assets:{...p.media_assets,storage_path:'/fixture-assets/intentionally-missing-cover.jpg'}}:p);
const hours=businesses.flatMap(b=>Array.from({length:7},(_,day)=>({id:b.id+'-hours-'+day,business_id:b.id,day_of_week:day,interval_number:1,opens_at:'07:00',closes_at:'21:00',is_closed:visualCase==='paused'&&b.id==='cafe'})));
const program={id:'program',business_id:'cafe',name:'Coffee rewards',reward_description:'A coffee on us',program_type:'visits',stamps_required:6,points_per_dollar:1,points_required:100,is_active:true,businesses:business};
const reviewEvent={id:'30000000-0000-4000-8000-000000000001',business_id:'cafe',slug:'fixture-coffee-tasting',title:'Local fixture: coffee tasting',description:'A synthetic event used to review the event layout and details.',starts_at:'2026-10-06T18:00:00Z',ends_at:'2026-10-06T19:30:00Z',timezone:'America/Chicago',location_mode:'business',address_text:'Main Street pickup, Hammond',external_url:null,age_note:null,capacity_text:null,rsvp_limit:20,is_published:true,publish_at:null,archived_at:null,media_assets:photos[0].media_assets,event_photos:[],businesses:business};
const outcomeId='40000000-0000-4000-8000-000000000001',outcomeBusiness='10000000-0000-4000-8000-000000000001';
const reviewOutcome={id:outcomeId,title:'More information requested',created_at:'2026-10-06T15:30:00Z',read_at:'2026-10-06T15:40:00Z',current_state:'draft',current_review_text:null,is_latest:true,outcome:{schema_version:1,kind:'business',action:'request_information',business_id:outcomeBusiness,resource_type:'business',resource_id:outcomeBusiness,public_reason:'Synthetic review: please clarify the location and identity of this listing before resubmission.',summary:'Your business listing needs clarification before it can be published.',next_step:'Review the feedback, update your listing, then submit it for review when all required information is complete.',decision_sequence:1},quick_action:{label:'Edit and resubmit your listing',app_path:'/business?id='+outcomeBusiness+'&section=review',web_path:'/account/businesses/'+outcomeBusiness+'/settings#readiness',mutates:false,requires_confirmation:false}};
// Add explicit presentation scenarios without claiming live merchant records.
const extendedTables:any={events:[reviewEvent],event_saves:[{event_id:reviewEvent.id,customer_id:"fixture-customer",reminder_enabled:false,reminder_minutes_before:1440,reminder_frequency:"once"}],notification_deliveries:[{id:outcomeId,user_id:'fixture-customer',business_id:null,notification_type:'operational',entity_type:'account',entity_id:outcomeBusiness,title:reviewOutcome.title,body:reviewOutcome.outcome.summary,url:'/notification?deliveryId='+outcomeId,status:'queued',inbox_available_at:'2026-10-06T15:30:00Z',created_at:reviewOutcome.created_at,read_at:reviewOutcome.read_at,dismissed_at:null,moderation_outcome:reviewOutcome.outcome}],service_requests:[{id:'50000000-0000-4000-8000-000000000001',business_id:'services',customer_id:'fixture-customer',customer_name:'Local review customer',customer_phone:'2255550100',request_message:'Synthetic inquiry: help with a small kitchen repair.',preferred_timing:'Next week',status:'new',created_at:'2026-10-06T15:00:00Z',form_answers:[],businesses:businesses[2]}]};
const tables:Record<string,unknown[]>={businesses,business_photos:photos,business_hours:hours,offering_sections:[{id:'coffee-section',business_id:'cafe',name:'Coffee & tea',description:null},{id:'breakfast-section',business_id:'cafe',name:'Breakfast',description:null}],offering_items:products.map((p,i)=>({id:p.id,business_id:'cafe',section_id:i===0?'coffee-section':'breakfast-section',name:p.name,description:p.description,price_minor:p.price,price_text:null,currency:'USD',is_available:true,is_featured:i===0,media_asset_id:null,media_assets:p.image?{storage_path:p.image,status:'ready',alt_text:p.name,width:1200,height:800}:null})),business_follows:[{business_id:'cafe',businesses:business}],loyalty_programs:[program],loyalty_memberships:[{id:'membership',business_id:'cafe',program_id:'program',is_active:true,stamps:3,points_balance:30,stamp_count:3,loyalty_programs:program,businesses:business}],profiles:[{id:'fixture-customer',display_name:'Local review customer',city:'Hammond',region_code:'LA',postal_code:'70401'}],business_members:[{id:'fixture-member',business_id:'cafe',user_id:'fixture-customer',role:'owner',is_active:true,businesses:business}],business_feature_subscriptions:[],business_feature_access:[]};
for(const row of [...tables.offering_sections,...tables.offering_items] as any[])row.is_visible=true;
// Both preserved and current routes read the same local-only request scenario.
extendedTables.service_request_forms=[{business_id:'services',revision:1,fields:[{id:'access',label:'Can we access the work area?',type:'yes_no',required:true,options:[]},{id:'project',label:'Project notes',type:'text',required:false,options:[]}]}];
(tables.offering_items as any[]).push({id:'repair-request',business_id:'services',name:'Home repair consultation',description:'A synthetic service option for reviewing an estimate request.',is_visible:true,is_available:true,archived_at:null,display_order:1});
tables.categories=[{id:1,name:'Coffee & tea',business_type:'food_drink',is_active:true},{id:2,name:'Food & drink',business_type:'food_drink',is_active:true}];
tables.business_categories=[{business_id:'cafe',category_id:1,is_primary:true,categories:{id:1,name:'Coffee & tea'}}];
function result(table:string,single:boolean,filters:[string,unknown][]) {
 let data=state==='empty'?[]:(extendedTables[table]||tables[table]||[]);
 if(state!=='empty'&&table==='businesses'&&filters.some(([field,value])=>field==='id'&&value===outcomeBusiness))data=[{...business,id:outcomeBusiness,name:'Local fixture: listing clarification',status:'draft',review_feedback:reviewOutcome.outcome.public_reason}];
 if(state!=='empty'&&table==='business_members'){const requested=filters.find(([field])=>field==='business_id')?.[1];if(requested==='services'||requested===outcomeBusiness)data=[{id:'fixture-context-member',business_id:requested,user_id:'fixture-customer',role:'owner',is_active:true}];}
 for(const [field,value]of filters)if(data.some((d:any)=>field in d))data=data.filter((d:any)=>d[field]===value);
 return {data:single?(data[0]||null):data,error:state==='error'?{message:'Local fixture connection error',code:'FIXTURE_ERROR'}:null,count:data.length};
}
function query(table:string){const filters:[string,unknown][]=[];let single=false;const chain:any=new Proxy({}, {get(_,key){if(key==='then')return (resolve:any,reject:any)=>state==='loading'?new Promise(()=>{}):Promise.resolve(result(table,single,filters)).then(resolve,reject);if(key==='eq')return (f:string,v:unknown)=>{filters.push([f,v]);return chain};if(key==='maybeSingle'||key==='single')return ()=>{single=true;return chain};if(['insert','update','delete','upsert'].includes(String(key)))return ()=>{throw new Error('Review fixture writes are disabled.');};return ()=>chain}});return chain;}
export const rpc=async(name:string,args:any={})=>{fixtureCalls.push({kind:'rpc',name});
 const preferenceRead=name==='order_notification_preference'&&!Object.prototype.hasOwnProperty.call(args,'p_enabled');
 if(!preferenceRead&&!/^(get_|list_|is_|discover_)/.test(name))throw new Error('Mutations are disabled in this local review fixture: '+name+'.');
 if(state==='loading')return new Promise(()=>{});
 let data:any=[];
 if(preferenceRead)data=false;
 if(name==='get_pickup_status')data=businesses.filter(b=>b.business_type==='food_drink').map(b=>({business_id:b.id,provider:'stripe',pickup_status:visualCase==='paused'&&b.id==='cafe'?'paused':'accepting',pickup_enabled:true}));
 if(name==='get_public_business_discovery_locations')data=businesses.map((b,i)=>({business_id:b.id,latitude:30.5045+i*.002,longitude:-90.4625,location_kind:'business',starts_at:null}));
 if(name==='get_public_business_review_summaries')data=businesses.map(b=>({business_id:b.id,average_rating:4.9,review_count:128}));
 if(name==='get_business_staff_invite_preview')data=args.p_token==='local-synthetic-only'&&session?{schema_version:1,business_id:'10000000-0000-4000-8000-000000000001',business_name:visualCase==='long-name'?'Bayou & Bloom Cafe - Coffee, Brunch & Pastries on Main Street':business.name,logo_path:visualCase==='no-logo'?null:'fixture-assets/cafe.svg',location_label:'Hammond, Louisiana',role:'staff',invite_status:'pending',expires_at:'2026-11-01T12:00:00Z'}:null;
 if(name==='is_platform_admin')data=new URLSearchParams(location.search).get('fixture')==='admin';
 if(name==='get_admin_moderation_snapshot')data={...readonlyAdmin.snapshot,records:(!args.p_kind||args.p_kind==='business')&&(!args.p_search||readonlyAdmin.record.title.toLowerCase().includes(String(args.p_search).toLowerCase()))?[readonlyAdmin.record]:[]};
 if(name==='get_admin_moderation_record')data=args.p_kind==='business'&&args.p_id===readonlyAdmin.record.id?readonlyAdmin.record:null;
 if(name==='get_business_reviews')data={reviews:state==='empty'?[]:[{id:'70000000-0000-4000-8000-000000000001',source:'order',orderId:'fixture',eventId:null,eventTitle:null,rating:4,text:'Synthetic review: friendly pickup and a fresh cup of coffee.',merchantResponse:null,moderationStatus:'published',createdAt:'2026-10-06T15:00:00Z'}]};
 if(name==='get_business_event_rsvp_attendees')data=[{rsvp_id:'80000000-0000-4000-8000-000000000001',attendee_name:'Synthetic attendee A',party_size:2,rsvp_status:'going',checked_in_at:null,created_at:'2026-10-06T14:00:00Z'},{rsvp_id:'80000000-0000-4000-8000-000000000002',attendee_name:'Synthetic attendee B',party_size:1,rsvp_status:'going',checked_in_at:'2026-10-06T17:50:00Z',created_at:'2026-10-06T14:00:00Z'},{rsvp_id:'80000000-0000-4000-8000-000000000003',attendee_name:'Synthetic attendee C',party_size:1,rsvp_status:'waitlisted',checked_in_at:null,created_at:'2026-10-06T14:00:00Z'}];
 if(name==='get_business_scan_stats')data={completed_scans:0,failed_scans:0,visits_added:0,points_issued:0,rewards_redeemed:0};
 if(name==='get_my_moderation_outcome')data=args.p_delivery_id===outcomeId?reviewOutcome:null;
 if(name==='get_my_moderation_outcomes')data=[reviewOutcome];
 if(name==='get_event_rsvp_group_summary')data={going_count:0,waitlist_count:0,rsvp_limit:reviewEvent.rsvp_limit,my_status:null,my_party_size:null,my_waitlist_position:null};
 if(name==='get_customer_appointments')data=[{id:'60000000-0000-4000-8000-000000000001',business_name:businesses[2].name,service_name:'Synthetic repair consultation',starts_at:'2026-10-07T17:00:00Z',ends_at:'2026-10-07T17:30:00Z',timezone:'America/Chicago',status:'confirmed',payment_status:'pay_in_person'}];
 if(name==='get_business_feature_access')data={businessId:args.p_business_id,enforced:true,planCode:'pro',featureCodes:['business_page','discovery','events','service_requests','basic_analytics','loyalty','follower_updates','staff_scanning','pickup_ordering','appointments']};
 if(name==='get_loyalty_wallet_v2'||name==='get_loyalty_wallet')data=[{membership_id:'membership',business_id:'cafe',business_name:business.name,primary_color:'#102D25',program_name:'Coffee rewards',reward_description:'A coffee on us',program_type:'visits',rewards_ready:0,progress_stamps:3,stamps_required:6,business_photos:photos}];
 if(name==='get_business_readiness')data={ready:false,checks:[{key:'category',label:'Business category',complete:true},{key:'description',label:'Business description',complete:true},{key:'contact',label:'Public contact',complete:false},{key:'location',label:'Location',complete:true},{key:'hours',label:'Opening hours',complete:true},{key:'logo',label:'Business logo',complete:true},{key:'cover',label:'Cover image',complete:true}]};
 if(/listing_billing/.test(name))data={plan:'free',status:'active',business_limit:1,can_create_business:true,active_business_count:1};
 // An empty fixture must produce an empty RPC collection as well as empty tables.
 if(state==='empty'&&Array.isArray(data))data=[];
 return {data,error:state==='error'?{message:'Local fixture error'}:null};
};
const noop=()=>{};
export const supabase:any={from:query,rpc,auth:{getSession:async()=>({data:{session},error:null}),getUser:async()=>({data:{user:session?.user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:noop}}}),signOut:async()=>({error:null})},channel:()=>({on(){return this},subscribe(){return this},unsubscribe:noop}),removeChannel:noop,storage:{from:()=>({getPublicUrl:(p:string)=>({data:{publicUrl:p}})})},functions:{invoke:async()=>({data:null,error:{message:'Hosted functions disabled in local review'}})}};
export const isSupabaseConfigured=true;
export async function commerce(action:string,body:any={}){
 if(state==='error')throw new Error('Local fixture connection error');if(state==='loading')return new Promise(()=>{});
 if(action==='catalog')return {products:state==='empty'?[]:products,businessName:business.name,provider:'stripe',currency:'USD',businessId:'cafe'};
 if(action==='my_event_review_candidates')return {events:state==='empty'?[]:[{eventId:reviewEvent.id,businessId:'cafe',businessName:business.name,title:reviewEvent.title,startsAt:reviewEvent.starts_at,checkedInAt:'2026-10-06T17:50:00Z',review:null}]};
 if(action==='availability')return {available:true,status:'open',products:state==='empty'?[]:products,enabled:true,accepting:true,kind:'open',slots:[slot],businessName:business.name,provider:'stripe',settings:{pickup_enabled:true}};
 if(action==='slots')return {slots:[slot]};
 // A review-only quote derived from the local cart. The existing fixture uses
 // a synthetic 10% tax solely to demonstrate the total hierarchy.
 if(action==='quote'){
  const subtotal=(body.cart||[]).reduce((sum:number,line:any)=>{const p=products.find(p=>p.id===line.variationId);if(!p)return sum;const extras=p.groups.flatMap(g=>g.modifiers).filter(m=>(line.modifierIds||[]).includes(m.id)).reduce((n,m)=>n+m.price,0);return sum+(p.price+extras)*line.quantity;},0);
  const tax=Math.round(subtotal/10);return {...quote,provider:'stripe',businessId:'cafe',subtotal,tax,total:subtotal+tax};
 }
 if(action==='reward_options')return {offer:null};
 if(action==='resume')return {order:null};
 if(action==='status')return {order};
 if(action==='operator_businesses')return {businesses:[{id:'cafe',businessId:'cafe',name:business.name,provider:'stripe',role:'owner',canManage:true,canRefund:true}]};
 if(action==='queue')return {orders:state==='empty'||body.view&&body.view!=='active'?[]:[order],nextOffset:null,business:{...business,timezone:slot.timezone},permissions:{canRefund:true,canManage:true},settings:{enabled:true,is_open:true,timezone:slot.timezone},connected:true,counts:{active:state==='empty'?0:1,placed:0,preparing:state==='empty'?0:1,ready:0,attention:0,requests:0},updatedAt:'2026-10-06T16:00:00Z'};
 if(action==='operator_detail'||action==='order_detail')return {order,permissions:{canRefund:true,canManage:true},supportRequests:[]};
 if(action==='operator_orders'||action==='customer_orders')return {orders:state==='empty'?[]:[order]};
 throw new Error('Review fixture does not execute '+action+'.');
}
export const pickupCapabilities=async()=>businesses.filter(b=>b.business_type==='food_drink').map(b=>({business_id:b.id,supports_pickup_ordering:true,provider:'stripe',pickup_status:visualCase==='paused'&&b.id==='cafe'?'paused':'accepting'}));
export const readOrderAccess=async()=>null;
export const newOrderAccess=async(id:string)=>({businessId:id,statusToken:'0'.repeat(64),idempotencyKey:'local-fixture'});
export const readCart=()=>[];
export const saveCart=async()=>{};
export const saveOrderAccess=async()=>{};
export const readGuestOrders=async()=>[];
export const readGuestOrderAccess=async()=>[];
export const openSquare=async()=>{throw new Error('External provider actions are disabled in local UI review.');};
export const openCheckout=async()=>{throw new Error('Payment submission is disabled in local UI review.');};
export const openSquareOAuth=openCheckout;export const openSquareSandboxDashboard=openCheckout;
const fixtureService={id:'repair',name:'Synthetic repair consultation',description:'A local review scenario for appointment browsing.',duration_minutes:30,buffer_minutes:0,price_minor:2500,currency:'USD',price_is_fixed:true,payment_policy:'pay_in_person',deposit_minor:null,deposit_percent:null,requires_resource:false,requires_approval:false,is_bookable:true,capacity:1,public_instructions:'Review fixture only.',internal_notes:'',resourceIds:[]};
const fixtureAppointment={id:'60000000-0000-4000-8000-000000000001',businessId:'services',serviceId:'repair',resourceId:null,service:{name:fixtureService.name,durationMinutes:30},resource:{},business:{name:businesses[2].name},customerName:'Local review customer',timezone:'America/Chicago',startAt:'2026-10-07T17:00:00Z',endAt:'2026-10-07T17:30:00Z',status:'confirmed',paymentStatus:'none',refundedMinor:0,refundableMinor:0,disputeState:null,totalMinor:2500,amountDueMinor:0,balanceMinor:2500,currency:'USD',cancellationCutoffMinutes:1440,checkoutUrl:null,version:1};
export const readGuestAppointmentIds=async()=>[];
export const readAppointmentAccess=async(appointmentId:string)=>({businessId:'services',appointmentId,idempotencyKey:'00000000-0000-4000-8000-000000000000',statusToken:'0'.repeat(64)});
export const saveAppointmentAccess=async()=>{};
export const appointmentAccess=async()=>{throw Error('Booking submission is disabled in local review.');};
export async function appointmentCommerce(action:string,body:any={}){fixtureCalls.push({kind:'appointment',name:action});
 if(state==='error')throw Error('Local appointment fixture error');if(state==='loading')return new Promise(()=>{});
 if(action==='appointment_public')return {business:{id:'services',name:businesses[2].name,phone:null,address:'Local fixture service address'},settings:{timezone:'America/Chicago',cancellationCutoffMinutes:1440,cancellationTerms:'Cancel at least one day before your appointment.',publicInstructions:'Synthetic booking preview.',bookingHorizonDays:60},services:state==='empty'?[]:[fixtureService]};
 if(action==='appointment_slots')return {slots:state==='empty'?[]:[{startAt:(body.date||'2026-10-06')+'T17:00:00Z',endAt:(body.date||'2026-10-06')+'T17:30:00Z',localTime:'12:00',utcOffsetMinutes:-300,resourceId:null,resourceName:null}]};
 if(action==='appointment_status')return {appointment:fixtureAppointment};
 if(action==='appointment_owner_setup')return {settings:null,services:[fixtureService],resources:[],members:[],windows:[],overrides:[]};
 if(action==='owner_status')return {connection:{state:'connected',locationId:'local-fixture'}};
 if(action==='appointment_queue')return {appointments:state==='empty'?[]:[{...fixtureAppointment,serviceName:fixtureService.name,resourceName:''}]};
 throw Error('Appointment actions are disabled in local review: '+action);
}
