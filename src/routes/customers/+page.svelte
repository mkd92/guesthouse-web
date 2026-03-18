<script>
  import { onMount } from 'svelte';
  import {
    getCustomers, addCustomer, updateCustomer, deleteCustomer,
    getAvailableBeds, addBooking, updateBooking, updateBed,
    getBookingsByCustomer, addTransaction,
    getProperties, getUnits, getAvailableUnits, addLease, updateUnit, getLeases
  } from '$lib/stores/data';
  import { user } from '$lib/stores/auth';
  import Modal from '$lib/components/Modal.svelte';
  import WhatsAppButton from '$lib/components/WhatsAppButton.svelte';
  import { format } from 'date-fns';

  let customers = [];
  let availableBeds = [];
  let properties = [];
  let availableUnits = [];
  let loading = true;
  let search = '';
  let tenantTypeFilter = 'all'; // all, pg, apartment, shop
  let showCustomerModal = false;
  let showCheckInModal = false;
  let showCheckOutModal = false;
  let showLeaseModal = false;
  let showEditBookingModal = false;
  let editingCustomer = null;
  let selectedCustomer = null;
  let editingBooking = null;
  let editBookingForm = { rentPerMonth: '', deposit: '' };

  // Tenant type maps (customerId -> type)
  let pgCustomerIds = new Set();
  let leaseCustomerIds = new Set();

  let customerForm = { name: '', phone: '', email: '', idType: 'Aadhaar', idNumber: '', address: '' };
  let checkInForm = { bedId: '', rentPerMonth: '', checkIn: format(new Date(), 'yyyy-MM-dd'), deposit: '' };
  let checkOutCustomer = null;
  let activeBooking = null;

  // Lease form
  let leaseForm = {
    propertyId: '', unitId: '', rentPerMonth: '',
    leaseStart: format(new Date(), 'yyyy-MM-dd'), leaseEnd: '',
    joiningFee: 0, depositAmount: 0, depositPaid: false
  };

  async function load() {
    loading = true;
    [customers, availableBeds, properties] = await Promise.all([
      getCustomers(), getAvailableBeds(), getProperties()
    ]);
    properties = properties.filter(p => p.type !== 'pg');

    // Determine tenant types for filter tabs
    const [bookings, leases] = await Promise.all([
      import('$lib/stores/data').then(m => m.getBookings('active')),
      getLeases({ status: 'active' })
    ]);
    pgCustomerIds = new Set(bookings.map(b => b.customerId));
    leaseCustomerIds = new Set(leases.map(l => l.customerId));

    loading = false;
  }

  onMount(load);

  $: filtered = customers.filter(c => {
    const matchesSearch = (
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
    );
    if (!matchesSearch) return false;
    if (tenantTypeFilter === 'pg') return pgCustomerIds.has(c.id);
    if (tenantTypeFilter === 'apartment' || tenantTypeFilter === 'shop') return leaseCustomerIds.has(c.id);
    return true;
  });

  function openCustomerModal(customer = null) {
    editingCustomer = customer;
    customerForm = customer
      ? { name: customer.name, phone: customer.phone, email: customer.email || '', idType: customer.idType || 'Aadhaar', idNumber: customer.idNumber || '', address: customer.address || '' }
      : { name: '', phone: '', email: '', idType: 'Aadhaar', idNumber: '', address: '' };
    showCustomerModal = true;
  }

  async function saveCustomer() {
    if (editingCustomer) {
      await updateCustomer(editingCustomer.id, customerForm);
    } else {
      await addCustomer(customerForm);
    }
    showCustomerModal = false;
    await load();
  }

  async function removeCustomer(id) {
    if (!confirm('Delete this customer? Any active booking will be checked out and the bed released.')) return;
    const bookings = await getBookingsByCustomer(id);
    const active = bookings.find(b => b.status === 'active');
    if (active) {
      await updateBooking(active.id, { status: 'checked_out', checkOut: new Date().toISOString() });
      await updateBed(active.bedId, { status: 'available' });
    }
    await deleteCustomer(id);
    await load();
  }

  async function openCheckIn(customer) {
    selectedCustomer = customer;
    checkInForm = { bedId: '', rentPerMonth: '', checkIn: format(new Date(), 'yyyy-MM-dd'), deposit: '' };
    showCheckInModal = true;
  }

  async function doCheckIn() {
    const bed = availableBeds.find(b => b.id === checkInForm.bedId);
    if (!bed) return alert('Please select a bed');
    try {
    const bookingRef = await addBooking({
      customerId: selectedCustomer.id,
      bedId: bed.id,
      propertyId: bed.propertyId || null,
      rentPerMonth: Number(checkInForm.rentPerMonth),
      deposit: Number(checkInForm.deposit) || 0,
      checkIn: new Date(checkInForm.checkIn).toISOString(),
      status: 'active',
    });
    await updateBed(bed.id, { status: 'occupied' });
    if (checkInForm.deposit && Number(checkInForm.deposit) > 0) {
      await addTransaction({
        bookingId: bookingRef.id,
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        bedName: bed.bedNumber,
        propertyId: bed.propertyId || null,
        source: 'pg',
        amount: Number(checkInForm.deposit),
        type: 'deposit',
        period: format(new Date(), 'MMMM yyyy'),
        status: 'paid',
        paidOn: format(new Date(), 'yyyy-MM-dd'),
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        notes: 'Security deposit on check-in',
      });
    }
    showCheckInModal = false;
    await load();
    } catch (err) {
      alert('Check-in failed: ' + (err?.message || JSON.stringify(err)));
    }
  }

  async function openCheckOut(customer) {
    const bookings = await getBookingsByCustomer(customer.id);
    activeBooking = bookings.find(b => b.status === 'active');
    if (!activeBooking) return alert('No active booking for this customer');
    checkOutCustomer = customer;
    showCheckOutModal = true;
  }

  async function doCheckOut() {
    const checkOutDate = new Date();
    await updateBooking(activeBooking.id, { status: 'checked_out', checkOut: checkOutDate.toISOString() });
    await updateBed(activeBooking.bedId, { status: 'available' });
    showCheckOutModal = false;
    await load();
  }

  async function openLeaseModal(customer) {
    selectedCustomer = customer;
    availableUnits = [];
    leaseForm = {
      propertyId: properties[0]?.id || '', unitId: '', rentPerMonth: '',
      leaseStart: format(new Date(), 'yyyy-MM-dd'), leaseEnd: '',
      joiningFee: 0, depositAmount: 0, depositPaid: false
    };
    if (leaseForm.propertyId) {
      availableUnits = await getAvailableUnits(leaseForm.propertyId);
    }
    showLeaseModal = true;
  }

  async function doCreateLease() {
    const unit = availableUnits.find(u => u.id === leaseForm.unitId);
    const property = properties.find(p => p.id === leaseForm.propertyId);
    if (!unit) return alert('Please select a unit');
    const leaseRef = await addLease({
      propertyId: leaseForm.propertyId,
      unitId: leaseForm.unitId,
      unitName: unit.name,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: selectedCustomer.phone || '',
      rentPerMonth: Number(leaseForm.rentPerMonth),
      leaseStart: new Date(leaseForm.leaseStart),
      leaseEnd: leaseForm.leaseEnd ? new Date(leaseForm.leaseEnd) : null,
      joiningFee: Number(leaseForm.joiningFee),
      depositAmount: Number(leaseForm.depositAmount),
      depositPaid: leaseForm.depositPaid,
      status: 'active',
      createdBy: $user.uid
    });
    await updateUnit(leaseForm.unitId, { status: 'occupied', currentLeaseId: leaseRef.id });
    if (Number(leaseForm.depositAmount) > 0) {
      await addTransaction({
        leaseId: leaseRef.id, unitId: leaseForm.unitId, unitName: unit.name,
        customerId: selectedCustomer.id, customerName: selectedCustomer.name,
        propertyId: leaseForm.propertyId, propertyName: property?.name || '',
        source: 'lease', amount: Number(leaseForm.depositAmount), type: 'deposit',
        period: format(new Date(), 'MMMM yyyy'),
        status: leaseForm.depositPaid ? 'paid' : 'pending',
        paidOn: leaseForm.depositPaid ? new Date() : null,
        dueDate: new Date(), notes: 'Security deposit', createdBy: $user.uid
      });
    }
    showLeaseModal = false;
    await load();
  }

  async function openEditBooking(customer) {
    const bookings = await getBookingsByCustomer(customer.id);
    editingBooking = bookings.find(b => b.status === 'active');
    if (!editingBooking) return;
    editBookingForm = {
      rentPerMonth: editingBooking.rentPerMonth,
      deposit: editingBooking.deposit
    };
    showEditBookingModal = true;
  }

  async function doEditBooking() {
    await updateBooking(editingBooking.id, {
      rentPerMonth: Number(editBookingForm.rentPerMonth),
      deposit: Number(editBookingForm.deposit) || 0
    });
    showEditBookingModal = false;
    await load();
  }

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return format(d, 'dd MMM yyyy');
  }

  function genericWhatsAppMessage(customer) {
    return `Hi ${customer.name}, this is a message from your property manager. Please contact us at your earliest convenience. Thank you.`;
  }
</script>

<div class="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="hidden md:block text-2xl font-bold text-gray-900">Customers</h1>
      <p class="text-sm text-gray-500 mt-0.5">{customers.length} total customers</p>
    </div>
    <button class="btn-primary" on:click={() => openCustomerModal()}>+ Add Customer</button>
  </div>

  <!-- Search -->
  <input
    class="input max-w-sm"
    placeholder="Search by name, phone or email..."
    bind:value={search}
  />

  <!-- Tenant type tabs -->
  <div class="flex gap-2 border-b pb-1">
    {#each [['all', 'All'], ['pg', 'PG'], ['apartment', 'Apartment'], ['shop', 'Shop']] as [val, label]}
      <button
        class="px-4 py-1.5 text-sm font-medium rounded-t-lg transition-colors
          {tenantTypeFilter === val ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}"
        on:click={() => tenantTypeFilter = val}
      >
        {label}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="space-y-2">
      {#each Array(5) as _}
        <div class="card animate-pulse h-16"></div>
      {/each}
    </div>
  {:else if filtered.length === 0}
    <div class="card text-center py-16">
      <p class="text-4xl mb-3">👥</p>
      <p class="text-gray-500">{search ? 'No customers match your search.' : 'No customers yet.'}</p>
      {#if !search}
        <button class="btn-primary mt-4" on:click={() => openCustomerModal()}>Add Customer</button>
      {/if}
    </div>
  {:else}
    <div class="space-y-2">
      {#each filtered as customer}
        <div class="card p-4">
          <!-- Top row: avatar + name + actions -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div class="min-w-0">
                <p class="font-semibold text-gray-900 break-words">{customer.name}</p>
                {#if customer.email}
                  <p class="text-xs text-gray-400 truncate">{customer.email}</p>
                {/if}
              </div>
            </div>
            <!-- Status badge -->
            {#if pgCustomerIds.has(customer.id)}
              <span class="badge-success text-xs flex-shrink-0">PG</span>
            {/if}
          </div>

          <!-- Details row -->
          <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {#if customer.phone}
              <div class="flex items-center gap-1">
                <span>{customer.phone}</span>
                <WhatsAppButton phone={customer.phone} message={genericWhatsAppMessage(customer)} />
              </div>
            {:else}
              <span>No phone</span>
            {/if}
            {#if customer.idNumber}
              <span>{customer.idType}: {customer.idNumber}</span>
            {/if}
          </div>

          <!-- Action buttons -->
          <div class="mt-3 flex gap-2 flex-wrap">
            {#if pgCustomerIds.has(customer.id)}
              <button class="btn-danger text-xs py-1.5 px-3" on:click={() => openCheckOut(customer)}>Check Out</button>
              <button class="btn-secondary text-xs py-1.5 px-3" on:click={() => openEditBooking(customer)}>Edit Rent</button>
            {:else}
              <button class="btn-success text-xs py-1.5 px-3" on:click={() => openCheckIn(customer)}>Assign Bed</button>
            {/if}
            {#if properties.length > 0}
              <button class="btn-secondary text-xs py-1.5 px-3" on:click={() => openLeaseModal(customer)}>Lease</button>
            {/if}
            <button class="btn-secondary text-xs py-1.5 px-3" on:click={() => openCustomerModal(customer)}>Edit</button>
            <button class="btn-danger text-xs py-1.5 px-3" on:click={() => removeCustomer(customer.id)}>Del</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Customer Modal -->
<Modal title={editingCustomer ? 'Edit Customer' : 'Add Customer'} bind:open={showCustomerModal}>
  <form on:submit|preventDefault={saveCustomer} class="space-y-4">
    <div>
      <label class="label">Full Name *</label>
      <input class="input" bind:value={customerForm.name} placeholder="Customer name" required />
    </div>
    <div>
      <label class="label">Phone *</label>
      <input class="input" type="tel" bind:value={customerForm.phone} placeholder="10-digit mobile" required />
    </div>
    <div>
      <label class="label">Email</label>
      <input class="input" type="email" bind:value={customerForm.email} placeholder="Optional" />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">ID Type</label>
        <select class="input" bind:value={customerForm.idType}>
          <option>Aadhaar</option>
          <option>Passport</option>
          <option>Voter ID</option>
          <option>PAN</option>
          <option>Driving License</option>
        </select>
      </div>
      <div>
        <label class="label">ID Number</label>
        <input class="input" bind:value={customerForm.idNumber} placeholder="ID number" />
      </div>
    </div>
    <div>
      <label class="label">Address</label>
      <textarea class="input" rows="2" bind:value={customerForm.address} placeholder="Home address"></textarea>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">{editingCustomer ? 'Update' : 'Add Customer'}</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showCustomerModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Check-In Modal -->
<Modal title="Assign PG Bed – {selectedCustomer?.name}" bind:open={showCheckInModal}>
  <form on:submit|preventDefault={doCheckIn} class="space-y-4">
    <div>
      <label class="label">Assign Bed *</label>
      {#if availableBeds.length === 0}
        <p class="text-sm text-red-500">No available beds at the moment.</p>
      {:else}
        <select class="input" bind:value={checkInForm.bedId} required>
          <option value="">Select a bed...</option>
          {#each availableBeds as bed}
            <option value={bed.id}>{bed.bedNumber}</option>
          {/each}
        </select>
      {/if}
    </div>
    <div>
      <label class="label">Check-In Date *</label>
      <input class="input" type="date" bind:value={checkInForm.checkIn} required />
    </div>
    <div>
      <label class="label">Monthly Rent (₹) *</label>
      <input class="input" type="number" bind:value={checkInForm.rentPerMonth} min="0" placeholder="e.g., 5000" required />
    </div>
    <div>
      <label class="label">Security Deposit (₹)</label>
      <input class="input" type="number" bind:value={checkInForm.deposit} min="0" placeholder="Optional" />
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-success flex-1" disabled={availableBeds.length === 0}>✅ Confirm Check-In</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showCheckInModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Check-Out Modal -->
<Modal title="Check Out – {checkOutCustomer?.name}" bind:open={showCheckOutModal}>
  <div class="space-y-4">
    {#if activeBooking}
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
        <p><strong>Bed:</strong> {activeBooking.bedNumber}</p>
        <p><strong>Check-in:</strong> {formatDate(activeBooking.checkIn)}</p>
        <p><strong>Monthly Rent:</strong> ₹{activeBooking.rentPerMonth?.toLocaleString()}</p>
      </div>
      <p class="text-sm text-gray-600">This will mark the bed as available and close the booking.</p>
      <div class="flex gap-3 pt-2">
        <button class="btn-danger flex-1" on:click={doCheckOut}>🚪 Confirm Check-Out</button>
        <button class="btn-secondary flex-1" on:click={() => showCheckOutModal = false}>Cancel</button>
      </div>
    {:else}
      <p class="text-gray-500">No active booking found.</p>
    {/if}
  </div>
</Modal>

<!-- Edit Booking Modal -->
<Modal title="Edit Booking – {editingBooking?.bedNumber}" bind:open={showEditBookingModal}>
  <form on:submit|preventDefault={doEditBooking} class="space-y-4">
    <div>
      <label class="label">Monthly Rent (₹)</label>
      <input class="input" type="number" bind:value={editBookingForm.rentPerMonth} min="0" required />
    </div>
    <div>
      <label class="label">Advance / Deposit (₹)</label>
      <input class="input" type="number" bind:value={editBookingForm.deposit} min="0" />
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">Save Changes</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showEditBookingModal = false}>Cancel</button>
    </div>
  </form>
</Modal>

<!-- Create Lease Modal -->
<Modal title="Create Lease – {selectedCustomer?.name}" bind:open={showLeaseModal} size="lg">
  <form on:submit|preventDefault={doCreateLease} class="space-y-4">
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Property *</label>
        <select class="input" bind:value={leaseForm.propertyId}
          on:change={async () => { availableUnits = await getAvailableUnits(leaseForm.propertyId); leaseForm.unitId = ''; }}
          required>
          <option value="">Select property...</option>
          {#each properties as p}
            <option value={p.id}>{p.name}</option>
          {/each}
        </select>
      </div>
      <div>
        <label class="label">Unit *</label>
        <select class="input" bind:value={leaseForm.unitId} required>
          <option value="">Select unit...</option>
          {#each availableUnits as u}
            <option value={u.id}>{u.name}{u.type ? ` (${u.type})` : ''}</option>
          {/each}
        </select>
      </div>
    </div>
    <div>
      <label class="label">Monthly Rent (₹) *</label>
      <input class="input" type="number" bind:value={leaseForm.rentPerMonth} min="0" required />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Lease Start *</label>
        <input class="input" type="date" bind:value={leaseForm.leaseStart} required />
      </div>
      <div>
        <label class="label">Lease End</label>
        <input class="input" type="date" bind:value={leaseForm.leaseEnd} />
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="label">Security Deposit (₹)</label>
        <input class="input" type="number" bind:value={leaseForm.depositAmount} min="0" />
      </div>
      <div class="flex items-end pb-2">
        {#if leaseForm.depositAmount > 0}
          <label class="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" bind:checked={leaseForm.depositPaid} class="w-4 h-4 rounded" />
            Deposit collected
          </label>
        {/if}
      </div>
    </div>
    <div class="flex gap-3 pt-2">
      <button type="submit" class="btn-primary flex-1">Create Lease</button>
      <button type="button" class="btn-secondary flex-1" on:click={() => showLeaseModal = false}>Cancel</button>
    </div>
  </form>
</Modal>
