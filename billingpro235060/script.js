document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('invoice-form');
  const tbody = document.getElementById('invoice-body');
  const subtotalEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const grandTotalEl = document.getElementById('grand-total');
  const printBtn = document.getElementById('print-btn');
  const yearSpan = document.getElementById('year');

  let items = [];

  // Set current year in footer
  yearSpan.textContent = new Date().getFullYear();

  // Helper to format numbers as currency
  const fmt = (num) => `$${num.toFixed(2)}`;

  const recalculate = () => {
    const subtotal = items.reduce((sum, it) => sum + it.total, 0);
    const tax = subtotal * 0.10; // 10% tax
    const grandTotal = subtotal + tax;

    subtotalEl.textContent = fmt(subtotal);
    taxEl.textContent = fmt(tax);
    grandTotalEl.textContent = fmt(grandTotal);
  };

  const renderTable = () => {
    tbody.innerHTML = '';
    items.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.classList.add('invoice-row');

      tr.innerHTML = `
        <td class="border p-2">${idx + 1}</td>
        <td class="border p-2">${it.description}</td>
        <td class="border p-2 text-right">${it.quantity}</td>
        <td class="border p-2 text-right">${fmt(it.unitPrice)}</td>
        <td class="border p-2 text-right">${fmt(it.total)}</td>
        <td class="border p-2 text-center">
          <button data-index="${idx}" class="text-red-600 hover:underline">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Attach delete handlers
    tbody.querySelectorAll('button[data-index]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index, 10);
        items.splice(index, 1);
        renderTable();
        recalculate();
      });
    });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const description = document.getElementById('item-description').value.trim();
    const quantity = parseInt(document.getElementById('item-quantity').value, 10);
    const unitPrice = parseFloat(document.getElementById('item-price').value);