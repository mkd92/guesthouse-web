<script>
  import { onMount } from 'svelte';
  import { getTransactions, getBookings, getBeds, getProperties, getExpenses, getLeases, getUnits } from '$lib/stores/data';
  import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

  let loading = true;
  let transactions = [];
  let bookings = [];
  let beds = [];
  let units = [];
  let properties = [];
  let expenses = [];
  let selectedMonth = format(new Date(), 'yyyy-MM');
  let selectedPropertyId = '';

  let stats = { totalRent: 0, paidRent: 0, pendingRent: 0, occupancyRate: 0, newGuests: 0, checkOuts: 0 };
  let monthlyData = [];
  let plStats = { income: 0, expenses: 0, net: 0 };

  async function load() {
    loading = true;
    [transactions, bookings, beds, units, properties, expenses] = await Promise.all([
      getTransactions(),
      getBookings(),
      getBeds(),
      getUnits(),
      getProperties(),
      getExpenses()
    ]);
    computeStats();
    computeMonthly();
    computePnL();
    loading = false;
  }

  function computeStats() {
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    let monthTxns = transactions.filter(t => {
      const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return d >= start && d <= end;
    });
    if (selectedPropertyId) monthTxns = monthTxns.filter(t => t.propertyId === selectedPropertyId);

    const totalRent = monthTxns.filter(t => t.type === 'rent').reduce((s, t) => s + t.amount, 0);
    const paidRent = monthTxns.filter(t => t.type === 'rent' && t.status === 'paid').reduce((s, t) => s + t.amount, 0);
    const pendingRent = monthTxns.filter(t => t.type === 'rent' && t.status === 'pending').reduce((s, t) => s + t.amount, 0);

    const filteredBeds = selectedPropertyId ? beds.filter(b => b.propertyId === selectedPropertyId) : beds;
    const occupiedBeds = filteredBeds.filter(b => b.status === 'occupied').length;
    const occupancyRate = filteredBeds.length > 0 ? Math.round((occupiedBeds / filteredBeds.length) * 100) : 0;

    let filteredBookings = bookings;
    if (selectedPropertyId) filteredBookings = bookings.filter(b => b.propertyId === selectedPropertyId);

    const newGuests = filteredBookings.filter(b => {
      const d = b.checkIn?.toDate ? b.checkIn.toDate() : new Date(b.checkIn);
      return d >= start && d <= end;
    }).length;

    const checkOuts = filteredBookings.filter(b => {
      if (!b.checkOut) return false;
      const d = b.checkOut?.toDate ? b.checkOut.toDate() : new Date(b.checkOut);
      return d >= start && d <= end;
    }).length;

    stats = { totalRent, paidRent, pendingRent, occupancyRate, newGuests, checkOuts };
  }

  function computeMonthly() {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const label = format(date, 'MMM yyyy');
      let monthTxns = transactions.filter(t => {
        const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt || Date.now());
        return d >= start && d <= end && t.type === 'rent';
      });
      if (selectedPropertyId) monthTxns = monthTxns.filter(t => t.propertyId === selectedPropertyId);
      const paid = monthTxns.filter(t => t.status === 'paid').reduce((s, t) => s + t.amount, 0);
      const pending = monthTxns.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0);
      data.push({ label, paid, pending, total: paid + pending });
    }
    monthlyData = data;
  }

  function computePnL() {
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    let monthTxns = transactions.filter(t => {
      const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      return d >= start && d <= end && t.status === 'paid';
    });
    if (selectedPropertyId) monthTxns = monthTxns.filter(t => t.propertyId === selectedPropertyId);
    const income = monthTxns.reduce((s, t) => s + t.amount, 0);

    let monthExpenses = expenses.filter(e => {
      const d = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return d >= start && d <= end;
    });
    if (selectedPropertyId) monthExpenses = monthExpenses.filter(e => e.propertyId === selectedPropertyId);
    const expTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);

    plStats = { income, expenses: expTotal, net: income - expTotal };
  }

  // Per-property summary
  $: propertySummary = properties.map(p => {
    const propTxns = transactions.filter(t => t.propertyId === p.id && t.status === 'paid');
    const income = propTxns.reduce((s, t) => s + t.amount, 0);
    const propExp = expenses.filter(e => e.propertyId === p.id).reduce((s, e) => s + e.amount, 0);
    const propBeds = beds.filter(b => b.propertyId === p.id);
    const propUnits = units.filter(u => u.propertyId === p.id);
    return { name: p.name, type: p.type, income, expenses: propExp, net: income - propExp, beds: propBeds.length, units: propUnits.length };
  });

  $: if (selectedMonth || selectedPropertyId) {
    computeStats();
    computeMonthly();
    computePnL();
  }

  onMount(load);

  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  $: maxBar = Math.max(...monthlyData.map(d => d.total), 1);
  $: filtBeds = selectedPropertyId ? beds.filter(b => b.propertyId === selectedPropertyId) : beds;
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Reports</h1>
      <p class="text-sm text-gray-500 mt-0.5">Financial & occupancy overview</p>
    </div>
    <div class="flex gap-2">
      {#if properties.length > 0}
        <select class="input w-auto" bind:value={selectedPropertyId}>
          <option value="">All Properties</option>
          {#each properties as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      {/if}
      <input type="month" class="input w-auto" bind:value={selectedMonth} />
    </div>
  </div>

  {#if loading}
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {#each Array(6) as _}
        <div class="card animate-pulse h-20"></div>
      {/each}
    </div>
  {:else}
    <!-- Stats grid -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <div class="card">
        <p class="text-sm text-gray-500">Total Rent Billed</p>
        <p class="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRent)}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">Rent Collected</p>
        <p class="text-2xl font-bold text-green-600">{formatCurrency(stats.paidRent)}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">Rent Pending</p>
        <p class="text-2xl font-bold text-red-600">{formatCurrency(stats.pendingRent)}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">PG Occupancy Rate</p>
        <p class="text-2xl font-bold text-blue-600">{stats.occupancyRate}%</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">New Check-ins</p>
        <p class="text-2xl font-bold text-purple-600">{stats.newGuests}</p>
      </div>
      <div class="card">
        <p class="text-sm text-gray-500">Check-outs</p>
        <p class="text-2xl font-bold text-orange-500">{stats.checkOuts}</p>
      </div>
    </div>

    <!-- P&L Summary -->
    <div class="card">
      <h2 class="font-semibold text-gray-900 mb-4">P&L – {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</h2>
      <div class="grid grid-cols-3 gap-4 text-center">
        <div>
          <p class="text-sm text-gray-500">Income</p>
          <p class="text-xl font-bold text-green-600">{formatCurrency(plStats.income)}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Expenses</p>
          <p class="text-xl font-bold text-red-500">{formatCurrency(plStats.expenses)}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Net</p>
          <p class="text-xl font-bold {plStats.net >= 0 ? 'text-green-700' : 'text-red-700'}">{formatCurrency(plStats.net)}</p>
        </div>
      </div>
    </div>

    <!-- Bar Chart - Last 6 months -->
    <div class="card">
      <h2 class="font-semibold text-gray-900 mb-6">Revenue – Last 6 Months</h2>
      <div class="flex items-end gap-3 h-48">
        {#each monthlyData as month}
          <div class="flex-1 flex flex-col items-center gap-1">
            <div class="w-full flex flex-col justify-end" style="height: 160px;">
              <div class="w-full rounded-t-md overflow-hidden" style="height: {Math.round((month.total / maxBar) * 100)}%">
                <div class="w-full bg-green-500" style="height: {month.total > 0 ? Math.round((month.paid / month.total) * 100) : 0}%"></div>
                <div class="w-full bg-red-400" style="height: {month.total > 0 ? Math.round((month.pending / month.total) * 100) : 0}%"></div>
              </div>
            </div>
            <p class="text-xs text-gray-500 mt-1 text-center leading-tight">{month.label}</p>
            <p class="text-xs font-semibold text-gray-700">{formatCurrency(month.total)}</p>
          </div>
        {/each}
      </div>
      <div class="flex gap-6 mt-4 text-xs text-gray-500">
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-green-500 inline-block"></span> Collected</span>
        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-400 inline-block"></span> Pending</span>
      </div>
    </div>

    <!-- Bed Occupancy -->
    <div class="card">
      <h2 class="font-semibold text-gray-900 mb-4">PG Bed Occupancy</h2>
      <div class="flex items-center gap-4">
        <div class="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            class="bg-blue-600 h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
            style="width: {stats.occupancyRate}%"
          >
            {#if stats.occupancyRate > 10}
              <span class="text-white text-xs font-medium">{stats.occupancyRate}%</span>
            {/if}
          </div>
        </div>
        <span class="text-sm text-gray-600">{filtBeds.filter(b => b.status === 'occupied').length} / {filtBeds.length} beds</span>
      </div>
      <div class="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
        <div>
          <p class="text-lg font-bold text-green-600">{filtBeds.filter(b => b.status === 'available').length}</p>
          <p class="text-gray-500">Available</p>
        </div>
        <div>
          <p class="text-lg font-bold text-blue-600">{filtBeds.filter(b => b.status === 'occupied').length}</p>
          <p class="text-gray-500">Occupied</p>
        </div>
        <div>
          <p class="text-lg font-bold text-yellow-500">{filtBeds.filter(b => b.status === 'maintenance').length}</p>
          <p class="text-gray-500">Maintenance</p>
        </div>
      </div>
    </div>

    <!-- Per-property summary -->
    {#if propertySummary.length > 0}
      <div class="card">
        <h2 class="font-semibold text-gray-900 mb-4">Per-Property Summary (All Time)</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left px-3 py-2 font-medium text-gray-600">Property</th>
                <th class="text-left px-3 py-2 font-medium text-gray-600">Type</th>
                <th class="text-right px-3 py-2 font-medium text-gray-600">Income</th>
                <th class="text-right px-3 py-2 font-medium text-gray-600">Expenses</th>
                <th class="text-right px-3 py-2 font-medium text-gray-600">Net</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              {#each propertySummary as p}
                <tr>
                  <td class="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                  <td class="px-3 py-2 text-gray-500 capitalize">{p.type}</td>
                  <td class="px-3 py-2 text-right text-green-600">{formatCurrency(p.income)}</td>
                  <td class="px-3 py-2 text-right text-red-500">{formatCurrency(p.expenses)}</td>
                  <td class="px-3 py-2 text-right font-semibold {p.net >= 0 ? 'text-green-700' : 'text-red-700'}">{formatCurrency(p.net)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  {/if}
</div>
