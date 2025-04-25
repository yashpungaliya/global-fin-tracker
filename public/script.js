    // public/script.js
    // Fetches tariff and stock data from JSON files, populates cards,
    // adds filtering/sorting, tab switching, links from tariff cards,
    // and displays simulated stock price change.

    document.addEventListener('DOMContentLoaded', () => {
        // --- DOM Element References ---
        const tariffView = document.getElementById('tariff-view');
        const stockView = document.getElementById('stock-view');
        const tariffCardContainer = document.getElementById('tariff-cards-container');
        const stockCardContainer = document.getElementById('stock-cards-container');
        const loadingTariffsDiv = document.getElementById('loading-tariffs');
        const loadingStocksDiv = document.getElementById('loading-stocks'); // Keep for potential future async loading
        const noDataMessage = document.getElementById('no-data');
        const filterReportingInput = document.getElementById('filter-reporting');
        const filterPartnerInput = document.getElementById('filter-partner');
        const filterCategoryInput = document.getElementById('filter-category');
        const clearFiltersButton = document.getElementById('clear-filters');
        const sortBySelect = document.getElementById('sort-by');
        const sortDirectionSelect = document.getElementById('sort-direction');
        const tariffCardCountDisplay = document.getElementById('tariff-card-count');
        const stockCardCountDisplay = document.getElementById('stock-card-count');
        const footerTimestamp = document.getElementById('footer-timestamp');
        const tabTariffsButton = document.getElementById('tab-tariffs');
        const tabStocksButton = document.getElementById('tab-stocks');
        const tariffControls = document.getElementById('tariff-controls');

        // --- State Variables ---
        let allTariffData = [];
        let allStockData = []; // Will be populated by fetch
        let currentTariffSortColumn = 'effectiveDate';
        let currentTariffSortDirection = 'desc';
        let currentView = 'tariffs'; // 'tariffs' or 'stocks'

        // --- Configuration ---
        const TARIFF_DATA_URL = 'data.json';
        const STOCK_DATA_URL = 'stocks.json'; // Path to the new stock data file

        // --- Core Functions ---

        /** Fetches initial data (tariffs and stocks) */
        async function loadInitialData() {
            console.log('Attempting to fetch initial data...');
            loadingTariffsDiv.style.display = 'block'; // Show loading for tariffs initially
            loadingStocksDiv.style.display = 'none'; // Stocks load quickly, hide initially
            noDataMessage.style.display = 'none';
            tariffCardContainer.innerHTML = '';
            stockCardContainer.innerHTML = '';

            try {
                // Fetch both data files concurrently
                const [tariffResponse, stockResponse] = await Promise.all([
                    fetch(TARIFF_DATA_URL),
                    fetch(STOCK_DATA_URL)
                ]);

                // Check responses
                if (!tariffResponse.ok) throw new Error(`Tariff data fetch failed: ${tariffResponse.status}`);
                if (!stockResponse.ok) throw new Error(`Stock data fetch failed: ${stockResponse.status}`);

                // Parse JSON
                const [tariffData, stockData] = await Promise.all([
                    tariffResponse.json(),
                    stockResponse.json()
                ]);

                console.log('Tariff data fetched successfully.');
                console.log('Stock data fetched successfully.');

                allTariffData = tariffData;
                allStockData = stockData;

                // Set initial sort controls for tariffs
                sortBySelect.value = currentTariffSortColumn;
                sortDirectionSelect.value = currentTariffSortDirection;

                // Apply filters and sort tariffs for initial display
                applyFiltersAndSort();
                // Pre-render stock cards (they are hidden initially)
                renderStockCards(allStockData);


            } catch (error) {
                console.error("Error fetching initial data:", error);
                showErrorState(`Could not load required data. Please check console and ensure '${TARIFF_DATA_URL}' and '${STOCK_DATA_URL}' are valid. Error: ${error.message}`, 'tariffs'); // Show error on default view
                allTariffData = [];
                allStockData = [];
                applyFiltersAndSort(); // Render empty state for tariffs
                renderStockCards([]); // Render empty state for stocks
            } finally {
                loadingTariffsDiv.style.display = 'none'; // Hide tariff loading
                updateFooterTimestamp();
            }
        }


        /** Renders the tariff data as cards, including a link to the stock view */
        function renderTariffCards(dataToDisplay) {
            tariffCardContainer.innerHTML = '';

            if (!Array.isArray(dataToDisplay) || dataToDisplay.length === 0) {
                if (currentView === 'tariffs') {
                    showErrorState('No matching tariff updates found for the current filters.', 'tariffs', 'No Results');
                }
                updateTariffCardCount(0);
                return;
            }
            if (currentView === 'tariffs') noDataMessage.style.display = 'none';

            dataToDisplay.forEach((update, index) => {
                const card = document.createElement('div');
                card.className = 'data-card';
                card.dataset.id = update.id || `tariff-${index}`;
                const { changeText, changeIndicator } = formatTariffChange(update.oldTariff, update.newTariff);
                const trendInfoId = `trend-tariff-${update.id || index}`;
                const trendDisplay = update.trendSummary ? createTrendHTML(trendInfoId, update.trendSummary) : '';

                // Added "View Stock Impact" button/link
                const stockImpactLinkHTML = `
                    <button class="view-stock-impact-btn text-xs text-blue-600 hover:text-blue-800 font-medium underline mt-2 inline-block">
                        View Potential Stock Impacts
                    </button>
                `;

                card.innerHTML = `
                    <div>
                        <div class="meta-info flex justify-between items-center mb-2">
                            <span class="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">${escapeHTML(update.category || 'N/A')}</span>
                            <span class="text-xs text-gray-500">${escapeHTML(update.effectiveDate || 'N/A')}</span>
                        </div>
                        <h3 class="text-base font-semibold text-gray-800 mb-1">
                            ${escapeHTML(update.reportingCountry || 'N/A')} → ${escapeHTML(update.partnerCountry || 'N/A')}
                        </h3>
                        <div class="tariff-change-display text-sm mb-3">
                            ${changeText} ${changeIndicator}
                        </div>
                        <p class="text-sm text-gray-600 leading-relaxed mb-4">
                            ${escapeHTML(update.impactSummary || 'No summary provided.')}
                        </p>
                    </div>
                    <div class="mt-auto pt-3 border-t border-gray-100">
                         ${trendDisplay ? `<div class="text-sm text-gray-600 mb-2">${trendDisplay}</div>` : ''}
                         ${stockImpactLinkHTML}
                    </div>`;
                tariffCardContainer.appendChild(card);
            });

            updateTariffCardCount(dataToDisplay.length);
            addTrendToggleListeners(tariffCardContainer);
            addStockLinkListeners(tariffCardContainer); // Add listeners for the new links
            console.log(`Rendered ${dataToDisplay.length} tariff cards.`);
        }

         /** Renders the stock data as cards, including 3-month change */
        function renderStockCards(dataToDisplay) {
            stockCardContainer.innerHTML = '';

            if (!Array.isArray(dataToDisplay) || dataToDisplay.length === 0) {
                 if (currentView === 'stocks') {
                    // Avoid showing error if data simply hasn't loaded yet during initial phase
                    if (loadingTariffsDiv.style.display === 'none') { // Check if initial load is likely done
                         showErrorState('No stock information available or failed to load.', 'stocks', 'No Data');
                    }
                 }
                 updateStockCardCount(0);
                 return;
            }
            if (currentView === 'stocks') noDataMessage.style.display = 'none';

            dataToDisplay.forEach((stock, index) => {
                const card = document.createElement('div');
                card.className = 'data-card'; // Use shared card class
                card.dataset.id = stock.id || `stock-${index}`;

                // Format 3-month change
                let changeHtml = '<span class="text-gray-500">N/A</span>'; // Default
                const changePct = parseFloat(stock.threeMonthChangePct);
                if (!isNaN(changePct)) {
                    const colorClass = changePct >= 0 ? 'text-green-600' : 'text-red-600';
                    const sign = changePct >= 0 ? '+' : '';
                    changeHtml = `<span class="${colorClass} font-semibold">${sign}${changePct.toFixed(1)}%</span>`;
                }

                card.innerHTML = `
                    <div>
                        <div class="meta-info flex justify-between items-center mb-2">
                             <span class="stock-ticker">${escapeHTML(stock.ticker || 'N/A')}</span>
                             <span class="stock-country">${escapeHTML(stock.country || 'N/A')}</span>
                        </div>
                        <h3 class="text-base font-semibold text-gray-800 mb-1">
                            ${escapeHTML(stock.companyName || 'Unknown Company')}
                        </h3>
                         <p class="text-xs text-gray-500 mb-3">${escapeHTML(stock.sector || 'N/A')}</p>
                         <p class="text-sm mb-3">
                            <span class="text-gray-600">3-Month Change:</span> ${changeHtml}
                         </p>
                        <p class="text-sm text-gray-600 leading-relaxed">
                            <strong>Potential Impact:</strong> ${escapeHTML(stock.potentialImpact || 'N/A')}
                        </p>
                    </div>
                    <div class="mt-auto pt-3">
                         <div class="h-5"></div> </div>
                `;
                stockCardContainer.appendChild(card);
            });

            updateStockCardCount(dataToDisplay.length);
            console.log(`Rendered ${dataToDisplay.length} stock cards.`);
        }


        /** Filters and sorts the tariff data, then renders the cards */
        function applyFiltersAndSort() {
            const reportingFilter = filterReportingInput.value.trim().toLowerCase();
            const partnerFilter = filterPartnerInput.value.trim().toLowerCase();
            const categoryFilter = filterCategoryInput.value.trim().toLowerCase();
            currentTariffSortColumn = sortBySelect.value;
            currentTariffSortDirection = sortDirectionSelect.value;
            console.log(`Applying filters and sorting tariffs by: ${currentTariffSortColumn}, Direction: ${currentTariffSortDirection}`);

            let filteredData = allTariffData.filter(item => {
                const reportingMatch = !reportingFilter || (item.reportingCountry && item.reportingCountry.toLowerCase().includes(reportingFilter));
                const partnerMatch = !partnerFilter || (item.partnerCountry && item.partnerCountry.toLowerCase().includes(partnerFilter));
                const categoryMatch = !categoryFilter || (item.category && item.category.toLowerCase().includes(categoryFilter));
                return reportingMatch && partnerMatch && categoryMatch;
            });

            const columnType = getSortColumnType(currentTariffSortColumn);
            filteredData.sort((a, b) => sortItems(a, b, currentTariffSortColumn, columnType, currentTariffSortDirection));

            renderTariffCards(filteredData);
        }

        /** Generic sorting function */
        function sortItems(a, b, column, type, direction) {
            let valA = a[column];
            let valB = b[column];

            if (type === 'date') {
                valA = new Date(valA); valB = new Date(valB);
                if (isNaN(valA) && isNaN(valB)) return 0; if (isNaN(valA)) return 1; if (isNaN(valB)) return -1;
                return direction === 'asc' ? valA - valB : valB - valA;
            } else if (type === 'number') {
                valA = parseFloat(valA); valB = parseFloat(valB);
                // Handle null/undefined/NaN for numeric sort - treat as lowest value on asc, highest on desc
                if (isNaN(valA) || valA === null) valA = (direction === 'asc' ? Infinity : -Infinity);
                if (isNaN(valB) || valB === null) valB = (direction === 'asc' ? Infinity : -Infinity);
                return direction === 'asc' ? valA - valB : valB - valA;
            } else { // String
                valA = String(valA || '').toLowerCase(); valB = String(valB || '').toLowerCase();
                if (valA < valB) return direction === 'asc' ? -1 : 1;
                if (valA > valB) return direction === 'asc' ? 1 : -1;
                return 0;
            }
        }


        /** Determines the data type of a sort column */
        function getSortColumnType(columnName) {
            if (columnName === 'effectiveDate') return 'date';
            if (columnName === 'newTariff' || columnName === 'oldTariff') return 'number';
            return 'string';
        }

        /** Creates the HTML for the trend info toggle */
        function createTrendHTML(trendInfoId, trendSummary) {
             return `
                <span class="info-icon" data-target="${trendInfoId}" title="Show/Hide Trend Info">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a1 1 0 0 0 0 2v3a1 1 0 0 0 1 1h1a1 1 0 1 0 0-2v-3a1 1 0 0 0-1-1H9Z" clip-rule="evenodd" />
                    </svg>
                </span>
                <div id="${trendInfoId}" class="trend-details">
                    <strong>Trend:</strong> ${escapeHTML(trendSummary)}
                </div>`;
        }

        /** Updates the UI to show an error or 'no data' message for a specific view */
        function showErrorState(message, viewType, title = "Data Problem") {
            const isInitialTariffLoadError = viewType === 'tariffs' && allTariffData.length === 0 && loadingTariffsDiv.style.display === 'none';
            if (currentView !== viewType && !isInitialTariffLoadError) return;

            loadingTariffsDiv.style.display = 'none';
            loadingStocksDiv.style.display = 'none';
            if (viewType === 'tariffs') tariffCardContainer.innerHTML = '';
            if (viewType === 'stocks') stockCardContainer.innerHTML = '';

            noDataMessage.innerHTML = `
                <p class="font-bold text-yellow-900">${escapeHTML(title)}</p>
                <p>${escapeHTML(message)}</p>
            `;
            noDataMessage.style.display = 'block';
        }

        /** Adds event listeners to info icons within a given container */
        function addTrendToggleListeners(container) {
            const infoIcons = container.querySelectorAll('.info-icon');
            infoIcons.forEach(icon => {
                icon.removeEventListener('click', handleTrendToggle);
                icon.addEventListener('click', handleTrendToggle);
            });
        }

        /** Handles the click event on an info icon */
        function handleTrendToggle(event) {
            const icon = event.currentTarget;
            const targetId = icon.dataset.target;
            const trendDiv = document.getElementById(targetId);
            if (trendDiv) {
                trendDiv.style.display = trendDiv.style.display === 'none' ? 'block' : 'none';
            }
        }

        /** Adds event listeners to the "View Stock Impact" buttons */
        function addStockLinkListeners(container) {
             const stockLinks = container.querySelectorAll('.view-stock-impact-btn');
             stockLinks.forEach(link => {
                 link.removeEventListener('click', handleStockLinkClick); // Prevent duplicates
                 link.addEventListener('click', handleStockLinkClick);
             });
        }

        /** Handles clicks on the "View Stock Impact" button */
        function handleStockLinkClick() {
            console.log('Switching to stock view...');
            showView('stocks'); // Switch to the stock tab
            // Scroll to the top of the page for better UX after tab switch
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }


        // --- View Switching Logic ---
        function showView(viewToShow) {
             currentView = viewToShow;
            noDataMessage.style.display = 'none';

            if (viewToShow === 'tariffs') {
                tariffView.classList.remove('hidden');
                stockView.classList.add('hidden');
                tabTariffsButton.classList.add('active');
                tabStocksButton.classList.remove('active');
                tariffControls.classList.remove('hidden');
                if (tariffCardContainer.innerHTML === '' && allTariffData.length > 0) {
                    applyFiltersAndSort();
                } else if (tariffCardContainer.innerHTML === '' && allTariffData.length === 0 && loadingTariffsDiv.style.display === 'none') {
                     showErrorState('No tariff updates found.', 'tariffs', 'No Results');
                }
                 updateTariffCardCount(tariffCardContainer.children.length);
            } else { // viewToShow === 'stocks'
                tariffView.classList.add('hidden');
                stockView.classList.remove('hidden');
                tabTariffsButton.classList.remove('active');
                tabStocksButton.classList.add('active');
                tariffControls.classList.add('hidden');
                // Re-render stocks from fetched data if needed (or if container is empty)
                if (stockCardContainer.innerHTML === '' && allStockData.length > 0) {
                     renderStockCards(allStockData);
                } else if (stockCardContainer.innerHTML === '' && allStockData.length === 0) {
                     // Check if initial load is done before showing error
                     if (loadingTariffsDiv.style.display === 'none') {
                         showErrorState('No stock information available or failed to load.', 'stocks', 'No Data');
                     }
                }
                 updateStockCardCount(stockCardContainer.children.length);
            }
        }


        // --- Helper Functions ---
        function updateTariffCardCount(count) { tariffCardCountDisplay.textContent = `Displaying ${count} tariff update${count !== 1 ? 's' : ''}.`; }
        function updateStockCardCount(count) { stockCardCountDisplay.textContent = `Displaying ${count} stock example${count !== 1 ? 's' : ''}.`; } // Updated text slightly

        function updateFooterTimestamp() {
            if (footerTimestamp) {
                const now = new Date();
                const options = { timeZone: "America/Los_Angeles", weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', timeZoneName: 'short' };
                footerTimestamp.textContent = now.toLocaleString("en-US", options);
            }
        }
        function formatTariffChange(oldTariff, newTariff) {
            const oldT = parseFloat(oldTariff);
            const newT = parseFloat(newTariff);
            const oldText = isNaN(oldT) || oldT === null ? 'N/A' : `${oldT.toFixed(1)}%`;
            const newText = isNaN(newT) || newT === null ? 'N/A' : `${newT.toFixed(1)}%`;
            const changeText = `${oldText} → ${newText}`;
            let changeIndicator = '';
            if (!isNaN(oldT) && !isNaN(newT) && oldT !== null && newT !== null) {
                const changeValue = (newT - oldT);
                if (changeValue > 0) { changeIndicator = `<span class="text-red-600 font-semibold ml-1">(+${changeValue.toFixed(1)}%)</span>`; }
                else if (changeValue < 0) { changeIndicator = `<span class="text-green-600 font-semibold ml-1">(-${Math.abs(changeValue).toFixed(1)}%)</span>`; }
                else { changeIndicator = `<span class="text-gray-500 ml-1">(No change)</span>`; }
            } else if (!isNaN(newT) && newT !== null) { changeIndicator = `<span class="text-blue-600 ml-1">(New Rate)</span>`; }
            return { changeText, changeIndicator };
        }
        function escapeHTML(str) {
           if (typeof str !== 'string') return str;
           return str.replace(/[&<>"']/g, match => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[match]));
        }

        // --- Event Handlers ---
        function handleFilterInput() { clearTimeout(window.filterTimeout); window.filterTimeout = setTimeout(applyFiltersAndSort, 300); }
        function handleSortChange() { applyFiltersAndSort(); }
        function handleClearFilters() {
            filterReportingInput.value = ''; filterPartnerInput.value = ''; filterCategoryInput.value = '';
            sortBySelect.value = 'effectiveDate'; sortDirectionSelect.value = 'desc';
            console.log('Filters cleared and sort reset.');
            applyFiltersAndSort();
        }

        // --- Initialization ---
        // Tariff Control Listeners
        filterReportingInput.addEventListener('input', handleFilterInput);
        filterPartnerInput.addEventListener('input', handleFilterInput);
        filterCategoryInput.addEventListener('input', handleFilterInput);
        sortBySelect.addEventListener('change', handleSortChange);
        sortDirectionSelect.addEventListener('change', handleSortChange);
        clearFiltersButton.addEventListener('click', handleClearFilters);

        // Tab Navigation Listeners
        tabTariffsButton.addEventListener('click', () => showView('tariffs'));
        tabStocksButton.addEventListener('click', () => showView('stocks'));

        // Load data and show initial view
        loadInitialData();
        // showView('tariffs'); // Initial view is set by default state variable

    }); // End DOMContentLoaded listener
    