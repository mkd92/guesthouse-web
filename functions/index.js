/**
 * GuestHouse Manager — Firebase Cloud Functions
 *
 * Functions included:
 *  1. generateMonthlyRent      — Scheduled: auto-creates pending rent transactions
 *                                on the 1st of every month for all active bookings.
 *  2. generateMonthlyLeaseRent — Scheduled: same cron, auto-creates pending rent
 *                                transactions for all active leases.
 *  3. onUserCreated            — Auth trigger: backup profile creation if the
 *                                client-side write fails during registration.
 *  4. onBookingCreated         — Firestore trigger: safety-net to mark bed as
 *                                occupied when a booking is created.
 *  5. onBookingCheckedOut      — Firestore trigger: safety-net to free the bed
 *                                when a booking is checked out.
 *  6. onLeaseCreated           — Firestore trigger: safety-net to mark unit as
 *                                occupied when an active lease is created.
 *  7. onLeaseTerminated        — Firestore trigger: safety-net to free unit when
 *                                a lease is terminated or expired.
 */

"use strict";

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── 1. SCHEDULED: Generate monthly rent transactions (PG bookings) ───────────
//
// Runs at 09:00 AM IST (03:30 UTC) on the 1st of every month.
// Creates a "pending" rent transaction for every active booking.
// Skips if a rent transaction for that booking + period already exists.
//
exports.generateMonthlyRent = functions
  .pubsub
  .schedule("30 3 1 * *")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const now = new Date();
    const period = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    // Rent is due on the 5th of the month
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);

    functions.logger.info(`[generateMonthlyRent] Starting for period: ${period}`);

    const bookingsSnap = await db
      .collection("bookings")
      .where("status", "==", "active")
      .get();

    if (bookingsSnap.empty) {
      functions.logger.info("[generateMonthlyRent] No active bookings. Done.");
      return null;
    }

    const batch = db.batch();
    let created = 0;
    let skipped = 0;

    for (const bookingDoc of bookingsSnap.docs) {
      const booking = bookingDoc.data();

      // Check whether this month's rent has already been recorded
      const existingSnap = await db
        .collection("transactions")
        .where("bookingId", "==", bookingDoc.id)
        .where("period", "==", period)
        .where("type", "==", "rent")
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        skipped++;
        continue;
      }

      const txnRef = db.collection("transactions").doc();
      batch.set(txnRef, {
        bookingId: bookingDoc.id,
        customerId: booking.customerId || null,
        customerName: booking.customerName || "",
        bedId: booking.bedId || null,
        bedNumber: booking.bedNumber || null,
        propertyId: booking.propertyId || null,
        source: "booking",
        amount: booking.rentPerMonth || 0,
        type: "rent",
        period,
        status: "pending",
        dueDate: admin.firestore.Timestamp.fromDate(dueDate),
        paidOn: null,
        notes: `Auto-generated monthly rent for ${period}`,
        createdBy: "system",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created++;
    }

    await batch.commit();
    functions.logger.info(
      `[generateMonthlyRent] Done. Created: ${created}, Skipped: ${skipped}`
    );
    return null;
  });

// ─── 2. SCHEDULED: Generate monthly rent transactions (leases) ────────────────
//
// Same schedule as generateMonthlyRent (30 3 1 * *).
// Creates a "pending" rent transaction for every active lease.
// Idempotency key: leaseId + period + type == 'rent'.
//
exports.generateMonthlyLeaseRent = functions
  .pubsub
  .schedule("30 3 1 * *")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const now = new Date();
    const period = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 5);

    functions.logger.info(`[generateMonthlyLeaseRent] Starting for period: ${period}`);

    const leasesSnap = await db
      .collection("leases")
      .where("status", "==", "active")
      .get();

    if (leasesSnap.empty) {
      functions.logger.info("[generateMonthlyLeaseRent] No active leases. Done.");
      return null;
    }

    const batch = db.batch();
    let created = 0;
    let skipped = 0;

    for (const leaseDoc of leasesSnap.docs) {
      const lease = leaseDoc.data();

      // Idempotency check
      const existingSnap = await db
        .collection("transactions")
        .where("leaseId", "==", leaseDoc.id)
        .where("period", "==", period)
        .where("type", "==", "rent")
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        skipped++;
        continue;
      }

      const txnRef = db.collection("transactions").doc();
      batch.set(txnRef, {
        leaseId: leaseDoc.id,
        unitId: lease.unitId || null,
        unitName: lease.unitName || "",
        customerId: lease.customerId || null,
        customerName: lease.customerName || "",
        propertyId: lease.propertyId || null,
        source: "lease",
        amount: lease.rentPerMonth || 0,
        type: "rent",
        period,
        status: "pending",
        dueDate: admin.firestore.Timestamp.fromDate(dueDate),
        paidOn: null,
        notes: `Auto-generated monthly rent for ${period}`,
        createdBy: "system",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      created++;
    }

    await batch.commit();
    functions.logger.info(
      `[generateMonthlyLeaseRent] Done. Created: ${created}, Skipped: ${skipped}`
    );
    return null;
  });

// ─── 3. AUTH TRIGGER: Backup user profile creation ────────────────────────────
//
// The client creates the Firestore user profile right after Firebase Auth
// registration. If that write fails (network drop, app crash, etc.), this
// function creates the profile as a fallback.
//
// A short delay is introduced so the client-side write can finish first.
//
exports.onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Give the client 3 seconds to write the profile itself
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const userRef = db.collection("users").doc(user.uid);
  const userSnap = await userRef.get();

  if (userSnap.exists) {
    functions.logger.info(
      `[onUserCreated] Profile already exists for ${user.uid}. Skipping.`
    );
    return null;
  }

  functions.logger.info(
    `[onUserCreated] Creating fallback profile for ${user.uid}`
  );

  // Determine role: first user becomes admin
  const metaRef = db.collection("_meta").doc("counts");
  const metaSnap = await metaRef.get();
  const isFirst = !metaSnap.exists;

  await userRef.set({
    name: user.displayName || user.email?.split("@")[0] || "New User",
    email: user.email || "",
    role: isFirst ? "admin" : "staff",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  if (isFirst) {
    await metaRef.set({ users: 1 });
  }

  return null;
});

// ─── 4. FIRESTORE TRIGGER: Mark bed as occupied on booking creation ────────────
//
// Safety net: if the client successfully creates the booking but fails to
// update the bed status, this trigger fixes the inconsistency.
//
exports.onBookingCreated = functions.firestore
  .document("bookings/{bookingId}")
  .onCreate(async (snap, context) => {
    const booking = snap.data();

    if (!booking.bedId || booking.status !== "active") return null;

    const bedRef = db.collection("beds").doc(booking.bedId);
    const bedSnap = await bedRef.get();
    if (!bedSnap.exists) return null;

    const bed = bedSnap.data();
    // Already correct — nothing to do
    if (bed.status === "occupied" && bed.currentBookingId === context.params.bookingId) {
      return null;
    }

    await bedRef.update({
      status: "occupied",
      currentBookingId: context.params.bookingId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `[onBookingCreated] Bed ${booking.bedId} marked occupied by booking ${context.params.bookingId}`
    );
    return null;
  });

// ─── 5. FIRESTORE TRIGGER: Free bed on checkout ───────────────────────────────
//
// Safety net: if the client marks a booking as checked-out but fails to
// update the bed status, this trigger releases the bed.
//
exports.onBookingCheckedOut = functions.firestore
  .document("bookings/{bookingId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only act when status transitions to "checked-out"
    if (before.status === after.status || after.status !== "checked-out") {
      return null;
    }

    if (!after.bedId) return null;

    const bedRef = db.collection("beds").doc(after.bedId);
    const bedSnap = await bedRef.get();
    if (!bedSnap.exists) return null;

    const bed = bedSnap.data();
    // Already released — nothing to do
    if (bed.status === "available") return null;

    await bedRef.update({
      status: "available",
      currentBookingId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `[onBookingCheckedOut] Bed ${after.bedId} freed after checkout of booking ${context.params.bookingId}`
    );
    return null;
  });

// ─── 6. FIRESTORE TRIGGER: Mark unit as occupied on lease creation ─────────────
//
// Safety net: if the client creates a lease but fails to update the unit status,
// this trigger marks the unit occupied.
//
exports.onLeaseCreated = functions.firestore
  .document("leases/{leaseId}")
  .onCreate(async (snap, context) => {
    const lease = snap.data();

    if (!lease.unitId || lease.status !== "active") return null;

    const unitRef = db.collection("units").doc(lease.unitId);
    const unitSnap = await unitRef.get();
    if (!unitSnap.exists) return null;

    const unit = unitSnap.data();
    // Already correct — nothing to do
    if (unit.status === "occupied" && unit.currentLeaseId === context.params.leaseId) {
      return null;
    }

    await unitRef.update({
      status: "occupied",
      currentLeaseId: context.params.leaseId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `[onLeaseCreated] Unit ${lease.unitId} marked occupied by lease ${context.params.leaseId}`
    );
    return null;
  });

// ─── 7. FIRESTORE TRIGGER: Free unit on lease termination/expiry ──────────────
//
// Safety net: if the client terminates/expires a lease but fails to update the
// unit status, this trigger releases the unit.
//
exports.onLeaseTerminated = functions.firestore
  .document("leases/{leaseId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only act when status transitions to "terminated" or "expired"
    if (before.status === after.status) return null;
    if (after.status !== "terminated" && after.status !== "expired") return null;

    if (!after.unitId) return null;

    const unitRef = db.collection("units").doc(after.unitId);
    const unitSnap = await unitRef.get();
    if (!unitSnap.exists) return null;

    const unit = unitSnap.data();
    // Already released — nothing to do
    if (unit.status === "available") return null;

    await unitRef.update({
      status: "available",
      currentLeaseId: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(
      `[onLeaseTerminated] Unit ${after.unitId} freed after lease ${context.params.leaseId} ${after.status}`
    );
    return null;
  });
