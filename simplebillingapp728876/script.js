const form = document.getElementById('item-form');
const itemsBody = document.getElementById('items-body');
const subtotalEl = document.getElementById('subtotal');
const taxEl = document.getElementById('tax');
const totalEl = document.getElementById('total');

let items = [];

// Utility to format currency
const formatCurrency = (value) => `$${Number(value).toFixed(2)}`;

// Recalculate and update summary
const updateSummary = () => {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = subtotal * 0.10; // 10% tax
  const total = subtotal + tax;

  subtotalEl.textContent = formatCurrency(subtotal);
  taxEl.textContent = formatCurrency(tax);
  totalEl.textContent = formatCurrency(total);
};

// Render items table
const renderItems = () => {
  itemsBody.innerHTML = '';
  items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.className = 'border-b last:border-b-0';
    row.innerHTML = `
      <td class="px-4 py-2">${item.name}</td>
      <td class="px-4 py-2 text-right">${item.quantity}</td>
      <td class="