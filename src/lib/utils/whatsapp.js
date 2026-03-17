export function buildWhatsAppLink(phone, message) {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('91') && digits.length === 12
    ? digits : `91${digits.slice(-10)}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function rentReminderMessage({ customerName, amount, period, propertyName }) {
  return `Hi ${customerName}, this is a reminder that your rent of ₹${amount.toLocaleString('en-IN')} for ${period} at ${propertyName} is due. Please arrange payment at your earliest convenience. Thank you.`;
}
