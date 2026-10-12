/**
 * EAYNI local mock API — DEVELOPMENT TOOLING ONLY.
 *
 * Mirrors the routes of `Cient.postman_collection.json` using the response
 * shapes observed on https://api.eayni.info/client on 2026-10-12 (bare arrays,
 * mongoose-paginate objects, `{ data }` only on /account/me, GeoJSON [lng, lat]).
 *
 *   node mock-server/server.mjs      # http://localhost:4300
 *   pnpm start:mock                  # ng serve against this server
 *
 * Nothing here is production data. Sign in with any email + "secret123",
 * or register a new account (any phone). OTP for the phone flow: 1234.
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT ?? 4300);
const TOKEN = 'mock-access-token';
const REFRESH = 'mock-refresh-token';
const now = () => new Date().toISOString();
const ago = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
const id = (p) => `${p}${Math.random().toString(16).slice(2, 10)}`;
const paginate = (docs, page = 1, limit = 10) => { const start = (page - 1) * limit; const slice = docs.slice(start, start + limit); const totalPages = Math.max(1, Math.ceil(docs.length / limit)); return { limit, hasPrevPage: page > 1, hasNextPage: page < totalPages, hasMore: page < totalPages, docs: slice, totalDocs: docs.length, totalPages, page, pagingCounter: start + 1 }; };

const regions = [
  { _id: '65ba8a3d584a2d51f2f1bc07', name_ar: 'المنطقه الشرقيه', name_en: 'Eastern Province', child: [{ _id: '65ba8afcf7642f7afc8ad30b', name_ar: 'الدمام', name_en: 'Damam' }, { _id: '65ba8b0a63577a3ce4de8c83', name_ar: 'الخبر', name_en: 'Khobar' }, { _id: '65de511546884078eab3edef', name_ar: 'الجبيل', name_en: 'Jubail' }] },
  { _id: '65c14f9ea0622d7ae6d0058e', name_ar: 'المنطقه الوسطي', name_en: 'Central Region', child: [{ _id: 'city_riyadh', name_ar: 'الرياض', name_en: 'Riyadh' }] },
];
const items = [
  { _id: '65bad2c376cd383ca5a72021', category: { _id: '65bad2c376cd383ca5a72022', name_ar: 'ملابس', name_en: 'clothes', image: 'https://eayni-assets.s3.amazonaws.com/app/items/C1.png', active: true, countable: true }, items: [
    { _id: '65bad2c376cd383ca5a72023', name_ar: 'ملابس رجالية', name_en: 'Male Cloths', reward: '20', active: true, countable: true, image: 'https://eayni-assets.s3.amazonaws.com/app/items/tunic.png' },
    { _id: '65bad2c376cd383ca5a72024', name_ar: 'ملابس نسائية', name_en: 'Female Cloths', reward: '20', active: true, countable: true, image: 'https://eayni-assets.s3.amazonaws.com/app/items/woman-clothes.png' },
    { _id: '65bad2c376cd383ca5a72027', name_ar: 'ملابس اطفال', name_en: 'children Cloths', reward: '30', active: true, countable: true, image: 'https://eayni-assets.s3.amazonaws.com/app/items/onesie.png' },
    { _id: '65bad2c376cd383ca5a72020', name_ar: 'منسوجات - بطانيات', name_en: 'Textiles - blankets', reward: '30', active: true, countable: true } ] },
  { _id: '65e6c9752812b0f953cd178e', category: { _id: 'c_acc', name_ar: 'الكماليات', name_en: 'Accessories', active: true, countable: true }, items: [
    { _id: '65e6c9409cf2eeb5e8abb7b7', name_ar: 'احذية', name_en: 'shoes', active: true, countable: true },
    { _id: '65e6c957b17a977120364e22', name_ar: 'حقائب', name_en: 'bags', reward: '25', active: true, countable: true } ] },
  { _id: '65bad5f762ccf3afc12f54f4', category: { _id: 'c_paper', name_ar: 'الورق والكرتون', name_en: 'Paper and cardboard', active: true, countable: true }, items: [
    { _id: '65bad5f762ccf3afc12f54f6', name_ar: 'ورق', name_en: 'Paper', reward: '10', active: true, countable: true },
    { _id: '65bad5f762ccf3afc12f54f7', name_ar: 'كتب', name_en: 'Books', reward: '10', active: true, countable: true } ] },
];
const groupById = Object.fromEntries(items.map((g) => [g._id, g]));
const users = [{ _id: 'user_1', name: 'سعود', email: 'saud@example.com', password: 'secret123', phone: '0555930749', avatar: '', is_phone_verified: false, email_verified: false, active: true, type: 'client', language: 'ar', country: 'KSA', location: { type: 'Point', coordinates: [] }, createdAt: ago(24 * 90) }];
const publicUser = (u) => { const { password, ...rest } = u; return rest; };
let orders = [
  { _id: 'ord_active', code: 'E-1042', status: 'order.driver.on_the_way', createdAt: ago(5), updatedAt: ago(1), region: regions[1], city: regions[1].child[0], location: [46.6753, 24.7136], address: 'حي العليا، شارع التحلية', address2: 'عمارة 12، الدور 3', phone: '0555930749',
    items: [{ category: groupById['65bad2c376cd383ca5a72021'], item_name_ar: 'ملابس اطفال', item_name_en: 'children Cloths', quantity: 3 }, { category: groupById['65e6c9752812b0f953cd178e'], item_name_ar: 'احذية', item_name_en: 'shoes', quantity: 2 }],
    images: [], driver: { _id: 'drv_1', name: 'أحمد', phone: '0501234567', vehicle: 'Toyota Hilux', plate: 'ب ح د 4521', location: { type: 'Point', coordinates: [46.72, 24.70] } },
    history: [{ status: 'order.client.send', createdAt: ago(5) }, { status: 'order.admin.confirmed', createdAt: ago(4) }, { status: 'order.driver.assigned', createdAt: ago(2) }, { status: 'order.driver.on_the_way', createdAt: ago(1) }] },
  { _id: 'ord_done_1', code: 'E-0981', status: 'order.driver.completed', createdAt: ago(24 * 12), updatedAt: ago(24 * 11), completedAt: ago(24 * 11), region: regions[1], city: regions[1].child[0], location: [46.66, 24.72], address: 'حي النخيل', phone: '0555930749',
    items: [{ category: groupById['65bad2c376cd383ca5a72021'], item_name_ar: 'ملابس رجالية', item_name_en: 'Male Cloths', quantity: 8 }], images: [], driver: { _id: 'drv_2', name: 'خالد', phone: '0509876543' },
    history: [{ status: 'order.client.send', createdAt: ago(24 * 12) }, { status: 'order.driver.completed', createdAt: ago(24 * 11) }] },
  { _id: 'ord_done_2', code: 'E-0870', status: 'order.driver.completed', createdAt: ago(24 * 50), updatedAt: ago(24 * 49), completedAt: ago(24 * 49), region: regions[1], city: regions[1].child[0], location: [46.71, 24.69], phone: '0555930749',
    items: [{ category: groupById['65e6c9752812b0f953cd178e'], item_name_ar: 'حقائب', item_name_en: 'bags', quantity: 4 }, { category: groupById['65bad5f762ccf3afc12f54f4'], item_name_ar: 'كتب', item_name_en: 'Books', quantity: 2 }], images: [], rate: { stars: 5, review: 'ممتاز' },
    history: [{ status: 'order.client.send', createdAt: ago(24 * 50) }, { status: 'order.driver.completed', createdAt: ago(24 * 49) }] },
  { _id: 'ord_cancel', code: 'E-0700', status: 'order.client.cancelled', createdAt: ago(24 * 80), updatedAt: ago(24 * 79), reason: 'سفر', region: regions[1], city: regions[1].child[0], location: [46.7, 24.7], phone: '0555930749', items: [{ category: groupById['65bad5f762ccf3afc12f54f4'], item_name_ar: 'ورق', item_name_en: 'Paper', quantity: 1 }], images: [], history: [] },
];
const chats = { ord_active: [{ _id: 'm1', text: 'مرحبًا، أنا في الطريق إليك', sender: { _id: 'drv_1', name: 'أحمد', type: 'driver' }, createdAt: ago(0.5) }] };
const notifications = [
  { _id: 'n1', title_ar: 'السائق في الطريق', title_en: 'Driver on the way', body_ar: 'أحمد متجه إلى موقعك الآن', body_en: 'Ahmed is heading to your location', read: false, type: 'driver', order: 'ord_active', createdAt: ago(1) },
  { _id: 'n2', title_ar: 'تم تأكيد طلبك', title_en: 'Request confirmed', body_ar: 'سنستلم طلبك قريبًا', body_en: 'We will collect your items soon', read: true, type: 'order', order: 'ord_active', createdAt: ago(4) },
];
const rewards = [
  { _id: 'rw1', name_ar: 'قسيمة قهوة', name_en: 'Coffee voucher', points: '150', active: true, image: '' },
  { _id: 'rw2', name_ar: 'شجرة باسمك', name_en: 'A tree in your name', points: '500', active: true, image: '' },
];
const points = { transactions: [{ _id: 't1', credit: 120, debit: 0, title_ar: 'طلب مكتمل E-0981', title_en: 'Completed request E-0981', createdAt: ago(24 * 11) }, { _id: 't2', credit: 120, debit: 0, title_ar: 'طلب مكتمل E-0870', title_en: 'Completed request E-0870', createdAt: ago(24 * 49) }], availableCredit: 240 };
const containers = [
  { _id: '699ffc2c38c346df4ef11dc9', name_ar: 'اعاده تدوير - تصنيف اول', name_en: '6 yard waste container', active: true, type: 'recycling', country: 'KSA', image: 'https://eayni-assets.s3.amazonaws.com/2026/02/26/an4Ra7XM8Lqhhj4a.jpeg',
    allowedRegions: { type: 'MultiPolygon', coordinates: [[[[46.64, 24.74], [46.72, 24.74], [46.72, 24.68], [46.64, 24.68], [46.64, 24.74]]]] } },
  { _id: 'cont_2', name_ar: 'حاوية الخبر', name_en: 'Khobar container', active: true, type: 'recycling', country: 'KSA', allowedRegions: { type: 'MultiPolygon', coordinates: [[[[50.09, 26.31], [50.13, 26.31], [50.13, 26.28], [50.09, 26.28], [50.09, 26.31]]]] } },
];

const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' }); res.end(JSON.stringify(body)); };
const readBody = (req) => new Promise((resolve) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } }); });
const lang = (req) => (req.headers['accept-language'] ?? 'ar').startsWith('en') ? 'en' : 'ar';
const authed = (req) => (req.headers.authorization ?? '') === `Bearer ${TOKEN}`;
const me = () => users[0];

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname.replace(/\/+$/, '') || '/';
  const m = req.method;
  const page = Number(url.searchParams.get('page') ?? 1);
  const body = m === 'GET' ? {} : await readBody(req);
  console.log(m, p, Object.keys(body).length ? JSON.stringify(body).slice(0, 160) : '');

  if (p === '/upload' && m === 'POST') return json(res, 200, { message: 'files upload successfully!', s3Result: [{ ETag: '"mock"' }], files: [{ url: `https://picsum.photos/seed/${id('')}/600/600`, contentType: 'image/jpeg' }] });
  if (p === '/health') return json(res, 200, { status: 'UP' });

  // ---- auth (shapes confirmed live) -------------------------------------------------
  if (p === '/auth/signin' && m === 'POST') {
    if (!body.email || !body.password) return json(res, 400, [{ type: 'Body', errors: { issues: [{ path: ['email'], message: 'Email is required' }] } }]);
    const u = users.find((x) => x.email === String(body.email).toLowerCase() && x.password === body.password);
    return u ? json(res, 200, { user: publicUser(u), accessToken: TOKEN, refreshToken: REFRESH }) : json(res, 401, { message: 'Sorry user or password incorrect' });
  }
  if (p === '/auth/signup' && m === 'POST') {
    if (!body.phone) return json(res, 500, { errorName: 'ValidationError', message: 'Validation failed: phone: Path `phone` is required.' });
    if (users.some((x) => x.email === String(body.email).toLowerCase())) return json(res, 400, { message: 'Sorry user already exist , try to rest your password', error: true });
    const u = { _id: id('user_'), name: body.name, email: String(body.email).toLowerCase(), password: body.password, phone: body.phone, avatar: 'https://eayni-assets.s3.amazonaws.com/app/profiles/user5.jpg', is_phone_verified: false, email_verified: false, active: true, type: 'client', language: lang(req), country: 'KSA', location: { type: 'Point', coordinates: [] }, createdAt: now() };
    users.unshift(u);
    return json(res, 200, { user: publicUser(u), accessToken: TOKEN });
  }
  if (p === '/auth/phone-signin' && m === 'POST') return body.phone ? json(res, 200, { message: 'OTP sent (mock: 1234)' }) : json(res, 400, { message: 'phone is required' });
  if (p === '/auth/phone-verify' && m === 'POST') return body.code === '1234' ? json(res, 200, { accessToken: TOKEN, refreshToken: REFRESH }) : json(res, 400, { message: 'Invalid code' });
  if (p === '/auth/refresh-token' && m === 'POST') return body.refreshToken === REFRESH ? json(res, 200, { accessToken: TOKEN, refreshToken: REFRESH }) : json(res, 401, { message: 'Invalid refresh token' });

  // ---- public --------------------------------------------------------------------
  if (p === '/public/country') return json(res, 200, [{ name_ar: 'المملكة العربية السعودية', name_en: 'Saudi arabia', code: 'KSA', active: true, dial: '+966', image: 'https://eayni-assets.s3.us-east-1.amazonaws.com/FLAGS/KSA.png' }, { name_ar: 'البحرين', name_en: 'Bahrain', code: 'BHR', active: true, dial: '+973' }]);
  if (p === '/public/items') return json(res, 200, items);
  if (p === '/public/regions') return json(res, 200, regions.map(({ child, ...r }) => r));
  if (/^\/public\/regions\/[^/]+\/cities$/.test(p)) return json(res, 200, regions.find((r) => r._id === p.split('/')[3])?.child ?? []);
  if (p === '/public/all-cities') return json(res, 200, regions.map((r) => ({ ...r, count: r.child.length })));
  if (p === '/public/cancellation-reasons') return json(res, 200, { _id: 'cr', value: { reasons_ar: ['تغيرت خططي', 'تأخر الاستلام'], reasons_en: ['My plans changed', 'Pickup took too long'] } });
  if (p === '/public/partners') return json(res, 200, paginate([{ _id: 'p1', name_ar: 'جمعية كسوة', name_en: 'Kiswa Charity', image: 'https://picsum.photos/seed/p1/200' }], page));
  if (p === '/public/sponsors') return json(res, 200, paginate([{ _id: 's1', name_ar: 'جمعية الفضول', name_en: 'Al-Fudul Charitable Society', image: 'https://picsum.photos/seed/s1/200', sponserType: 'Golden' }], page));
  if (p === '/public/bunners') return json(res, 200, [{ _id: 'b1', image: 'https://picsum.photos/seed/b1/840/360' }]);
  if (p === '/public/ad') return json(res, 200, { url: 'https://picsum.photos/seed/ad/600/800.jpg' });
  if (p === '/public/social-services') return json(res, 200, paginate([{ _id: 'ss1', image: 'https://picsum.photos/seed/ss1/840/400', title_ar: 'مبادرة تنظيف البر', title_en: 'Wilderness cleanup initiative', content_ar: 'مبادرة لتنظيف البر في سدير بمشاركة المجتمع.', content_en: 'A community initiative to clean the wilderness in Sudair.' }], page, 5));
  if (p === '/public/news' || p === '/public/clients' || p === '/public/positive-reviews') return json(res, 200, []);
  if (p === '/public/page') { const slug = url.searchParams.get('page'); if (slug === 'privacy') return json(res, 200, null); const l = lang(req); return json(res, 200, { _id: 'pg', image: 'https://eayni-assets.s3.amazonaws.com/app/logo/logo.png', [`title_${l}`]: l === 'ar' ? 'معلومات عنا' : 'About us', [`content_${l}`]: l === 'ar' ? '**جمعية عيني**\n\nجمعية تعاونية متخصصة في إعادة التدوير.\n\n- الملابس\n- الورق والكرتون' : '**Eayni**\n\nA cooperative recycling association.\n\n- Clothes\n- Paper and cardboard' }); }
  if (p === '/public/contacts') return json(res, 200, { _id: 'ct', value: { socialmedia: [{ image: '', url: 'https://wa.me/+966509444514', name: 'واتس اب' }, { image: '', url: 'https://instagram.com/eayni_recycling', name: 'انستقرام' }], phone: '0509444514', email: 'info@eayni.org', website: 'https://eayni.org', address: 'الخبر' } });
  if (p === '/public/contact/submit' && m === 'POST') return json(res, 200, { message: 'received' });

  // ---- authenticated ---------------------------------------------------------------
  if (!authed(req)) return json(res, 401, { message: 'Unauthorized' });

  if (p === '/account/me') return json(res, 200, { data: publicUser(me()) });
  if (p === '/account/profile' && m === 'PUT') { Object.assign(me(), { name: body.name ?? me().name, email: body.email ?? me().email, avatar: body.avatar ?? me().avatar }); return json(res, 200, { data: publicUser(me()) }); }
  if (p === '/account' && m === 'DELETE') { me().active = false; return json(res, 200, { message: 'Your account will be removed within 14 days. Please take necessary action to retain access. Thank you.' }); }
  if (p === '/account/notifications') return json(res, 200, paginate(notifications, page));
  if (p === '/account/drivers') return json(res, 200, []);
  if (p === '/account/points') return json(res, 200, { transactions: paginate(points.transactions, page), totalCredit: 240, totalDebit: 0, availableCredit: points.availableCredit });
  if (p === '/account/rewards') return json(res, 200, paginate(rewards, page));
  if (/^\/account\/rewards\/[^/]+\/redeem$/.test(p) && m === 'POST') { const rw = rewards.find((r) => r._id === p.split('/')[3]); if (!rw) return json(res, 404, { message: 'not found' }); if (points.availableCredit < Number(rw.points)) return json(res, 400, { message: 'Not enough points' }); points.availableCredit -= Number(rw.points); return json(res, 200, { availableCredit: points.availableCredit }); }
  if (p === '/account/containers') return json(res, 200, paginate(containers, page));
  if (p === '/account/containers/activity') return json(res, 200, paginate([], page));
  if (/^\/account\/containers\/[^/]+\/(empty|maintenance|requested)$/.test(p) && m === 'POST') return json(res, 200, { message: 'ok' });

  if (p === '/order/check') { const running = orders.find((o) => !/completed|cancel/.test(o.status)) ?? null; const toRate = orders.find((o) => o.status === 'order.driver.completed' && !o.rate) ?? null; return json(res, 200, { runningOrder: running, requestForRateOrder: toRate }); }
  if (p === '/order' && m === 'GET') { const st = url.searchParams.get('status'); return json(res, 200, paginate(st ? orders.filter((o) => o.status === st) : orders, page)); }
  if (p === '/order/submit' && m === 'POST') {
    for (const k of ['region', 'city', 'location', 'items', 'phone']) if (!body[k]) return json(res, 400, [{ type: 'Body', errors: { issues: [{ path: [k], message: `${k} is required` }] } }]);
    const region = regions.find((r) => r._id === body.region) ?? body.region;
    const city = regions.flatMap((r) => r.child).find((c) => c._id === body.city) ?? body.city;
    const o = { _id: id('ord_'), code: `E-${1100 + orders.length}`, status: 'order.client.send', createdAt: now(), updatedAt: now(), region, city, location: body.location, address: body.address, address2: body.address2, phone: body.phone, images: body.images ?? [], items: body.items.map((i) => ({ ...i, category: groupById[i.category] ?? i.category })), history: [{ status: 'order.client.send', createdAt: now() }] };
    orders.unshift(o);
    return json(res, 201, o);
  }
  if (p === '/order/geo/address' && m === 'POST') { const [lng, lat] = body.coordinates ?? []; const riyadh = Math.abs(lat - 24.7) < 1 && Math.abs(lng - 46.7) < 1; return json(res, 200, { address: riyadh ? (lang(req) === 'ar' ? 'طريق الملك فهد، حي العليا، الرياض' : 'King Fahd Rd, Olaya, Riyadh') : 'Unknown area' }); }
  let mm;
  if ((mm = p.match(/^\/order\/([^/]+)\/chat$/))) { const list = chats[mm[1]] ?? (chats[mm[1]] = []); if (m === 'POST') { list.push({ _id: id('m'), text: body.text, sender: { _id: me()._id, type: 'client' }, createdAt: now() }); return json(res, 201, list.at(-1)); } return json(res, 200, list); }
  if ((mm = p.match(/^\/order\/([^/]+)\/rate$/)) && m === 'POST') { const o = orders.find((x) => x._id === mm[1]); if (!o) return json(res, 404, { message: 'not found' }); o.rate = { stars: body.stars, review: body.review }; return json(res, 200, o); }
  if ((mm = p.match(/^\/order\/([^/]+)$/))) {
    const o = orders.find((x) => x._id === mm[1]); if (!o) return json(res, 404, { message: 'not found' });
    if (m === 'PUT') { Object.assign(o, { phone: body.phone ?? o.phone, address: body.address ?? o.address, address2: body.address2 ?? o.address2, items: body.items ? body.items.map((i) => ({ ...i, category: groupById[i.category] ?? i.category })) : o.items, updatedAt: now() }); return json(res, 200, o); }
    if (m === 'DELETE') { o.status = 'order.client.cancelled'; o.reason = body.reason; o.updatedAt = now(); return json(res, 200, o); }
  }
  json(res, 404, { message: `No mock for ${m} ${p}` });
}).listen(PORT, () => console.log(`EAYNI mock API listening on http://localhost:${PORT}  (login: saud@example.com / secret123)`));
