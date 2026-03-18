import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vgazbwdrzgkyeixfldej.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Raw bank statement rows: [date, customerName, upiRef, amount]
const bankRows = [
  ['2026-03-01', 'VENKATESHWARAN M',           'UPI/642635275853', 2000],
  ['2026-03-01', 'Mohan P',                    'UPI/606067906273', 1000],
  ['2026-03-01', 'P J RINOLD ROSARIO',         'UPI/536024517119', 3500],
  ['2026-03-01', 'ABINESHKUMAR',               'UPI/834771099582', 3300],
  ['2026-03-02', 'JAYAKRISHNAN',               'UPI/606102659857', 2500],
  ['2026-03-02', 'ARAVINDHAN P',               'UPI/606141170336', 3300],
  ['2026-03-02', null,                         'UPI/642750411142', 23000], // no name
  ['2026-03-02', null,                         'UPI/642753600144', 1000],  // no name
  ['2026-03-02', 'MUKESH',                     'UPI/642743769725', 3500],
  ['2026-03-02', 'SHABEEK',                    'UPI/642785768015', 4000],
  ['2026-03-03', 'SARAVANAVEL',                'UPI/642878378606', 3000],
  ['2026-03-03', 'KARTHI NANJUNDESHWARAN',     'UPI/119426670662', 3000],
  ['2026-03-03', 'RAJESH YADHAV S',            'UPI/642846588522', 2000],
  ['2026-03-03', 'KANCHI SURESH BABU',         'UPI/851472470573', 3500],
  ['2026-03-03', 'MADHAVAN',                   'UPI/606293808339', 2000],
  ['2026-03-03', 'SUDHANA SUNDAR',             'UPI/606247531460', 3000],
  ['2026-03-03', 'SAKTHIVEL',                  'UPI/642841263545', 2000],
  ['2026-03-03', 'SAKTHIVEL',                  'UPI/642893754060', 500],
  ['2026-03-05', 'SESHATHRI KARUNAMOORTHI',    'UPI/234234997783', 2000],
  ['2026-03-05', 'SUSHANT PANT',               'UPI/533322128055', 3500],
  ['2026-03-05', 'ARUL NIXAN ADAIKKALARAJ',    'UPI/643008551442', 3000],
  ['2026-03-05', 'F HARITH AHMAD',             'NEFT-UTIB-AXNGG06475965876', 3000],
  ['2026-03-05', 'RAJESH M',                   'UPI/643015881466', 1000],
  ['2026-03-05', 'RAJESH M',                   'UPI/643025390350', 2000],
  ['2026-03-05', 'HARI DASS V',                'UPI/119526800586', 1000],
  ['2026-03-05', 'HARI DASS V',                'UPI/119526757615', 2000],
  ['2026-03-05', 'MANIKANDAN',                 'UPI/643025577220', 2000],
  ['2026-03-06', 'VENKATAPRASATH R',           'UPI/606519007211', 1000],
  ['2026-03-06', 'VENKATAPRASATH R',           'UPI/606596160735', 2000],
  ['2026-03-06', 'DHAYANIDHI M',              'UPI/606586570409', 1000],
  ['2026-03-07', 'MURUGAN C',                  'UPI/643228977009', 2700],
  ['2026-03-07', 'MURUGAN C',                  'UPI/643263269508', 300],
  ['2026-03-07', 'PALANI KUMAR AYYAKANNU',     'UPI/606614411054', 1000],
  ['2026-03-07', 'PALANI KUMAR B',             'UPI/606624219937', 2000],
  ['2026-03-08', 'VINOTH KUMAR D',             'UPI/119722397341', 1500],
  ['2026-03-08', 'FERNANDO',                   'UPI/643359852712', 3000],
  ['2026-03-08', 'SAM',                        'UPI/643330052946', 3000],
  ['2026-03-09', 'TAMIL',                      'UPI/606829034190', 3000],
  ['2026-03-09', 'SELWAKUMAR KRISHNASWAMY',    'UPI/606817635345', 1000],
  ['2026-03-09', 'SELWAKUMAR KRISHNASWAMY',    'UPI/606814429627', 2000],
  ['2026-03-09', 'MADAN KUMAR M',              'UPI/643422557779', 2000],
  ['2026-03-10', 'DHAYANIDHI M',              'UPI/643576703706', 2000],
  ['2026-03-10', 'VIGNESHWARAN T',             'UPI/064225813584', 2500],
  ['2026-03-11', 'GOPINATH',                   'UPI/772689220754', 3500],
  ['2026-03-11', 'SYED BADULLA BASHA',         'UPI/160512848283', 2000],
  ['2026-03-11', 'MOHAN P',                    null, 2000],
  ['2026-03-11', 'SYED BADULLA BASHA',         null, 1000],
  ['2026-03-11', 'PRADEEP KUMAR',              null, 2000],
  ['2026-03-11', 'PRADEEP KUMAR',              null, 1000],
  ['2026-03-12', 'ANZIL AHAMMAD N',            null, 2000],
  ['2026-03-12', 'ANZIL AHAMMAD N',            null, 1300],
  ['2026-03-12', 'HARIKRISHNAN SUNDARESAN',    null, 2800],
  ['2026-03-12', 'MADAN KUMAR M',              null, 1000],
  ['2026-03-12', 'AJEETH A',                   null, 3500],
  ['2026-03-12', 'HARIKRISHNAN SUNDARESAN',    null, 200],
  ['2026-03-12', 'IRULANDI GANESAN',           null, 2000],
  ['2026-03-12', 'IRULANDI GANESAN',           null, 500],
  ['2026-03-12', 'GANESHKUMAR',                null, 3000],
  ['2026-03-13', 'KATHIR',                     null, 2000],
];

function normalize(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

function similarity(a, b) {
  a = normalize(a);
  b = normalize(b);
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  // word overlap
  const wa = new Set(a.split(' '));
  const wb = new Set(b.split(' '));
  const common = [...wa].filter(w => wb.has(w) && w.length > 1).length;
  const total = Math.max(wa.size, wb.size);
  return common / total;
}

function findCustomer(name, customers) {
  if (!name) return null;
  let best = null, bestScore = 0;
  for (const c of customers) {
    const s = similarity(name, c.name);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return bestScore >= 0.5 ? { customer: best, score: bestScore } : null;
}

async function run() {
  // Fetch customers and IOB Current account
  const [{ data: customers, error: ce }, { data: accounts, error: ae }] = await Promise.all([
    supabase.from('customers').select('id, name'),
    supabase.from('accounts').select('id, name'),
  ]);
  if (ce) { console.error('Customers error:', ce); process.exit(1); }
  if (ae) { console.error('Accounts error:', ae); process.exit(1); }

  console.log(`Loaded ${customers.length} customers, ${accounts.length} accounts\n`);

  const iobAccount = accounts.find(a => normalize(a.name).includes('iob') || normalize(a.name).includes('current'));
  console.log(`Account to use: ${iobAccount ? iobAccount.name : 'NOT FOUND — will be null'}\n`);

  const toInsert = [];
  const unmatched = [];

  for (const [date, bankName, upiRef, amount] of bankRows) {
    const match = findCustomer(bankName, customers);
    if (!match && bankName) {
      unmatched.push({ date, bankName, amount });
    }
    toInsert.push({
      customer_id: match?.customer.id || null,
      customer_name: match?.customer.name || bankName || 'Unknown',
      amount,
      type: 'rent',
      period: 'March 2026',
      status: 'paid',
      paid_on: date,
      due_date: date,
      account_id: iobAccount?.id || null,
      notes: upiRef || '',
      booking_id: null,
    });
  }

  if (unmatched.length > 0) {
    console.log('⚠️  Unmatched customers (will insert with null customer_id):');
    for (const u of unmatched) {
      console.log(`  ${u.date}  "${u.bankName}"  ₹${u.amount}`);
    }
    console.log('');
  }

  console.log(`Inserting ${toInsert.length} transactions...`);
  const { error } = await supabase.from('transactions').insert(toInsert);
  if (error) {
    console.error('Insert error:', error);
    process.exit(1);
  }
  console.log('✅ Done!');
}

run();
