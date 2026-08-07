document.addEventListener('DOMContentLoaded', () => {
  let budget = parseFloat(localStorage.getItem('hak_monthly_budget')) || 6000000;
  let budgetLabelText = localStorage.getItem('hak_budget_label') || 'GAJIAN AGUSTUS 2026';
  let transactions = JSON.parse(localStorage.getItem('hak_transactions')) || [];
  let customCategories = JSON.parse(localStorage.getItem('hak_custom_categories')) || [];
  let expenseChart = null;

  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  
  const totalBudgetInput = document.getElementById('totalBudgetInput');
  const dailyLimitDisplay = document.getElementById('dailyLimitDisplay');
  const remainingDaysCount = document.getElementById('remainingDaysCount');
  const totalExpensesDisplay = document.getElementById('totalExpensesDisplay');
  const spentPercentageText = document.getElementById('spentPercentageText');
  const remainingBalanceDisplay = document.getElementById('remainingBalanceDisplay');
  
  const safeguardWarningBanner = document.getElementById('safeguardWarningBanner');
  const warningBannerText = document.getElementById('warningBannerText');
  const budgetTitleLabel = document.getElementById('budgetTitleLabel');

  const editLabelBtn = document.getElementById('editLabelBtn');
  const labelModal = document.getElementById('labelModal');
  const labelTextInput = document.getElementById('labelTextInput');
  const saveLabelBtn = document.getElementById('saveLabelBtn');
  const cancelLabelBtn = document.getElementById('cancelLabelBtn');

  const transactionForm = document.getElementById('transactionForm');
  const itemNameInput = document.getElementById('itemName');
  const itemAmountInput = document.getElementById('itemAmount');
  const itemCategorySelect = document.getElementById('itemCategory');
  const sortTransactionsSelect = document.getElementById('sortTransactionsSelect');
  const transactionList = document.getElementById('transactionList');

  const customCategoryModal = document.getElementById('customCategoryModal');
  const customCategoryInput = document.getElementById('customCategoryInput');
  const saveCustomCatBtn = document.getElementById('saveCustomCatBtn');
  const cancelCustomCatBtn = document.getElementById('cancelCustomCatBtn');

  const chartCanvas = document.getElementById('expenseChart');
  const chartEmptyState = document.getElementById('chartEmptyState');

  // Inisialisasi nilai awal input budget
  totalBudgetInput.value = budget;
  budgetTitleLabel.textContent = budgetLabelText;

  // Event listener saat nilai budget diketik langsung di kolomnya
  totalBudgetInput.addEventListener('input', () => {
    const val = parseFloat(totalBudgetInput.value);
    budget = !isNaN(val) && val >= 0 ? val : 0;
    refreshUI();
  });

  editLabelBtn.addEventListener('click', () => {
    labelTextInput.value = budgetTitleLabel.textContent;
    labelModal.classList.add('active');
  });
  cancelLabelBtn.addEventListener('click', () => labelModal.classList.remove('active'));
  saveLabelBtn.addEventListener('click', () => {
    const val = labelTextInput.value.trim();
    if (val) {
      budgetTitleLabel.textContent = val;
      localStorage.setItem('hak_budget_label', val);
      labelModal.classList.remove('active');
    }
  });

  function initCategories() {
    const existingCustomOpts = itemCategorySelect.querySelectorAll('.custom-opt');
    existingCustomOpts.forEach(el => el.remove());

    const customAddOption = itemCategorySelect.querySelector('option[value="custom_add"]');
    
    customCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = `📁 ${cat}`;
      opt.className = 'custom-opt';
      itemCategorySelect.insertBefore(opt, customAddOption);
    });
  }

  itemCategorySelect.addEventListener('change', () => {
    if (itemCategorySelect.value === 'custom_add') {
      customCategoryInput.value = '';
      customCategoryModal.classList.add('active');
    }
  });

  cancelCustomCatBtn.addEventListener('click', () => {
    customCategoryModal.classList.remove('active');
    itemCategorySelect.value = '';
  });

  saveCustomCatBtn.addEventListener('click', () => {
    const newCat = customCategoryInput.value.trim();
    if (newCat && !customCategories.includes(newCat)) {
      customCategories.push(newCat);
      localStorage.setItem('hak_custom_categories', JSON.stringify(customCategories));
      initCategories();
      itemCategorySelect.value = newCat;
      customCategoryModal.classList.remove('active');
    } else {
      alert('Kategori sudah ada atau nama kosong!');
    }
  });

  if (localStorage.getItem('hak_theme') === 'dark') {
    document.body.classList.add('dark-mode');
    themeIcon.className = 'fa-solid fa-sun';
  }

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeIcon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    localStorage.setItem('hak_theme', isDark ? 'dark' : 'light');
    renderChart();
  });

  function formatRupiah(amount) {
    return 'Rp ' + amount.toLocaleString('id-ID');
  }

  function refreshUI() {
    const totalExpenses = transactions.reduce((sum, item) => sum + item.amount, 0);
    const remaining = budget - totalExpenses;
    const percentage = budget > 0 ? Math.min(Math.round((totalExpenses / budget) * 100), 100) : 0;

    const now = new Date();
    const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const remDays = Math.max(totalDaysInMonth - currentDay + 1, 1);
    const dailyLimit = Math.max(Math.round(remaining / remDays), 0);

    dailyLimitDisplay.innerHTML = `${formatRupiah(dailyLimit)} <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">/hari</span>`;
    remainingDaysCount.textContent = remDays;
    totalExpensesDisplay.textContent = formatRupiah(totalExpenses);
    spentPercentageText.textContent = `${percentage}% terpakai`;
    remainingBalanceDisplay.textContent = formatRupiah(remaining);

    if (dailyLimit < 50000) {
      safeguardWarningBanner.classList.add('active');
      warningBannerText.textContent = `PERINGATAN SAFEGUARD: Target harian Anda kurang dari Rp 50.000/hari (${formatRupiah(dailyLimit)})!`;
    } else {
      safeguardWarningBanner.classList.remove('active');
    }
    
    renderTransactionList();

    localStorage.setItem('hak_transactions', JSON.stringify(transactions));
    localStorage.setItem('hak_monthly_budget', budget.toString());
    renderChart();
  }

  function renderTransactionList() {
    transactionList.innerHTML = '';
    if (transactions.length === 0) {
      transactionList.innerHTML = `<div class="empty-state"><p>Belum ada riwayat transaksi.</p></div>`;
      return;
    }

    let sortedTransactions = [...transactions];
    const sortBy = sortTransactionsSelect.value;

    if (sortBy === 'newest') {
      sortedTransactions.sort((a, b) => b.id - a.id);
    } else if (sortBy === 'oldest') {
      sortedTransactions.sort((a, b) => a.id - b.id);
    } else if (sortBy === 'amount-high') {
      sortedTransactions.sort((a, b) => b.amount - a.amount);
    } else if (sortBy === 'amount-low') {
      sortedTransactions.sort((a, b) => a.amount - b.amount);
    } else if (sortBy === 'category') {
      sortedTransactions.sort((a, b) => a.category.localeCompare(b.category));
    }

    sortedTransactions.forEach(item => {
      const el = document.createElement('div');
      el.className = 'transaction-item';
      el.innerHTML = `
        <div class="item-info">
          <div class="item-icon" style="background: rgba(16,185,129,0.2); color: #10b981;"><i class="fa-solid fa-receipt"></i></div>
          <div class="item-details">
            <h4>${item.name}</h4>
            <span>${item.category} • ${item.date}</span>
          </div>
        </div>
        <div class="item-right">
          <span class="item-amount">- ${formatRupiah(item.amount)}</span>
          <button class="delete-btn" data-id="${item.id}"><i class="fa-solid fa-trash-can"></i></button>
        </div>`;
      transactionList.appendChild(el);
    });
  }

  sortTransactionsSelect.addEventListener('change', renderTransactionList);

  function renderChart() {
    if (transactions.length === 0) {
      chartCanvas.style.display = 'none';
      chartEmptyState.style.display = 'flex';
      if (expenseChart) { expenseChart.destroy(); expenseChart = null; }
      return;
    }
    chartCanvas.style.display = 'block';
    chartEmptyState.style.display = 'none';

    const totals = {};
    transactions.forEach(t => { totals[t.category] = (totals[t.category] || 0) + t.amount; });

    if (expenseChart) {
      expenseChart.data.labels = Object.keys(totals);
      expenseChart.data.datasets[0].data = Object.values(totals);
      expenseChart.update();
    } else {
      expenseChart = new Chart(chartCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: Object.keys(totals),
          datasets: [{ data: Object.values(totals), backgroundColor: ['#0284c7', '#059669', '#7e22ce', '#b45309', '#be185d', '#64748b', '#38bdf8'] }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } }, cutout: '70%' }
      });
    }
  }

  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    transactions.unshift({
      id: Date.now().toString(),
      name: itemNameInput.value.trim(),
      amount: parseFloat(itemAmountInput.value),
      category: itemCategorySelect.value,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    });
    transactionForm.reset();
    refreshUI();
  });

  transactionList.addEventListener('click', (e) => {
    const btn = e.target.closest('.delete-btn');
    if (!btn) return;
    transactions = transactions.filter(t => t.id !== btn.dataset.id);
    refreshUI();
  });

  initCategories();
  refreshUI();
});