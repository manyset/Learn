// ERP Menu Configuration
const erpMenuConfig = {
    modules: [
        {
            id: 'dashboard',
            title: 'Dashboard',
            icon: 'fas fa-tachometer-alt',
            subModules: [
                { id: 'dashboard_overview', title: 'Overview', icon: 'fas fa-chart-line' },
                { id: 'dashboard_analytics', title: 'Analytics', icon: 'fas fa-chart-bar' },
                { id: 'dashboard_reports', title: 'Reports', icon: 'fas fa-file-alt' },
                { id: 'dashboard_metrics', title: 'Key Metrics', icon: 'fas fa-bullseye' },
                { id: 'dashboard_alerts', title: 'Alerts', icon: 'fas fa-bell' },
                { id: 'dashboard_notifications', title: 'Notifications', icon: 'fas fa-envelope' },
                { id: 'dashboard_tasks', title: 'Tasks', icon: 'fas fa-tasks' },
                { id: 'dashboard_calendar', title: 'Calendar', icon: 'fas fa-calendar' },
                { id: 'dashboard_activity', title: 'Activity Feed', icon: 'fas fa-stream' },
                { id: 'dashboard_settings', title: 'Dashboard Settings', icon: 'fas fa-cog' }
            ]
        },
        {
            id: 'sales',
            title: 'Sales',
            icon: 'fas fa-shopping-cart',
            subModules: [
                { id: 'sales_leads', title: 'Leads', icon: 'fas fa-user-friends' },
                { id: 'sales_opportunities', title: 'Opportunities', icon: 'fas fa-chart-pie' },
                { id: 'sales_orders', title: 'Orders', icon: 'fas fa-file-invoice' },
                { id: 'sales_invoices', title: 'Invoices', icon: 'fas fa-receipt' },
                { id: 'sales_customers', title: 'Customers', icon: 'fas fa-users' },
                { id: 'sales_products', title: 'Products', icon: 'fas fa-box' },
                { id: 'sales_quotations', title: 'Quotations', icon: 'fas fa-quote-right' },
                { id: 'sales_commissions', title: 'Commissions', icon: 'fas fa-hand-holding-usd' },
                { id: 'sales_forecasting', title: 'Forecasting', icon: 'fas fa-chart-line' },
                { id: 'sales_performance', title: 'Performance', icon: 'fas fa-trophy' }
            ]
        },
        {
            id: 'inventory',
            title: 'Inventory',
            icon: 'fas fa-warehouse',
            subModules: [
                { id: 'inventory_stock', title: 'Stock Levels', icon: 'fas fa-boxes' },
                { id: 'inventory_products', title: 'Products', icon: 'fas fa-box-open' },
                { id: 'inventory_suppliers', title: 'Suppliers', icon: 'fas fa-truck' },
                { id: 'inventory_purchase', title: 'Purchase Orders', icon: 'fas fa-clipboard-list' },
                { id: 'inventory_warehouses', title: 'Warehouses', icon: 'fas fa-building' },
                { id: 'inventory_movements', title: 'Stock Movements', icon: 'fas fa-exchange-alt' },
                { id: 'inventory_valuation', title: 'Valuation', icon: 'fas fa-dollar-sign' },
                { id: 'inventory_reorder', title: 'Reorder Points', icon: 'fas fa-exclamation-circle' },
                { id: 'inventory_reports', title: 'Inventory Reports', icon: 'fas fa-file-contract' },
                { id: 'inventory_settings', title: 'Inventory Settings', icon: 'fas fa-cogs' }
            ]
        },
        {
            id: 'finance',
            title: 'Finance',
            icon: 'fas fa-money-check-alt',
            subModules: [
                { id: 'finance_accounts', title: 'Accounts', icon: 'fas fa-book' },
                { id: 'finance_payables', title: 'Payables', icon: 'fas fa-sign-out-alt' },
                { id: 'finance_receivables', title: 'Receivables', icon: 'fas fa-sign-in-alt' },
                { id: 'finance_payroll', title: 'Payroll', icon: 'fas fa-money-bill-wave' },
                { id: 'finance_budgeting', title: 'Budgeting', icon: 'fas fa-chart-pie' },
                { id: 'finance_tax', title: 'Tax Management', icon: 'fas fa-percentage' },
                { id: 'finance_reports', title: 'Financial Reports', icon: 'fas fa-file-invoice-dollar' },
                { id: 'finance_audit', title: 'Audit Trail', icon: 'fas fa-search-dollar' },
                { id: 'finance_banking', title: 'Banking', icon: 'fas fa-university' },
                { id: 'finance_currencies', title: 'Currencies', icon: 'fas fa-coins' }
            ]
        },
        {
            id: 'hr',
            title: 'Human Resources',
            icon: 'fas fa-users-cog',
            subModules: [
                { id: 'hr_employees', title: 'Employees', icon: 'fas fa-user-tie' },
                { id: 'hr_attendance', title: 'Attendance', icon: 'fas fa-user-clock' },
                { id: 'hr_leaves', title: 'Leaves', icon: 'fas fa-umbrella-beach' },
                { id: 'hr_payroll', title: 'Payroll', icon: 'fas fa-money-check' },
                { id: 'hr_recruitment', title: 'Recruitment', icon: 'fas fa-user-plus' },
                { id: 'hr_training', title: 'Training', icon: 'fas fa-graduation-cap' },
                { id: 'hr_appraisals', title: 'Performance Appraisals', icon: 'fas fa-star' },
                { id: 'hr_benefits', title: 'Benefits', icon: 'fas fa-hand-holding-heart' },
                { id: 'hr_policies', title: 'Policies', icon: 'fas fa-file-signature' },
                { id: 'hr_reports', title: 'HR Reports', icon: 'fas fa-chart-area' }
            ]
        },
        {
            id: 'manufacturing',
            title: 'Manufacturing',
            icon: 'fas fa-industry',
            subModules: [
                { id: 'manufacturing_production', title: 'Production Orders', icon: 'fas fa-cogs' },
                { id: 'manufacturing_bom', title: 'Bill of Materials', icon: 'fas fa-list-alt' },
                { id: 'manufacturing_routing', title: 'Routing', icon: 'fas fa-route' },
                { id: 'manufacturing_scheduling', title: 'Scheduling', icon: 'fas fa-calendar-alt' },
                { id: 'manufacturing_quality', title: 'Quality Control', icon: 'fas fa-clipboard-check' },
                { id: 'manufacturing_maintenance', title: 'Maintenance', icon: 'fas fa-tools' },
                { id: 'manufacturing_costing', title: 'Costing', icon: 'fas fa-calculator' },
                { id: 'manufacturing_capacity', title: 'Capacity Planning', icon: 'fas fa-chart-bar' },
                { id: 'manufacturing_workcenters', title: 'Work Centers', icon: 'fas fa-hard-hat' },
                { id: 'manufacturing_reports', title: 'Production Reports', icon: 'fas fa-clipboard-list' }
            ]
        },
        {
            id: 'procurement',
            title: 'Procurement',
            icon: 'fas fa-clipboard-check',
            subModules: [
                { id: 'procurement_vendors', title: 'Vendors', icon: 'fas fa-handshake' },
                { id: 'procurement_purchasing', title: 'Purchasing', icon: 'fas fa-shopping-basket' },
                { id: 'procurement_rfq', title: 'RFQ Management', icon: 'fas fa-question-circle' },
                { id: 'procurement_contracts', title: 'Contracts', icon: 'fas fa-file-contract' },
                { id: 'procurement_approvals', title: 'Approvals', icon: 'fas fa-check-double' },
                { id: 'procurement_receiving', title: 'Receiving', icon: 'fas fa-dolly' },
                { id: 'procurement_evaluation', title: 'Vendor Evaluation', icon: 'fas fa-star-half-alt' },
                { id: 'procurement_catalog', title: 'Catalog Management', icon: 'fas fa-book-open' },
                { id: 'procurement_spend', title: 'Spend Analysis', icon: 'fas fa-chart-line' },
                { id: 'procurement_settings', title: 'Procurement Settings', icon: 'fas fa-sliders-h' }
            ]
        },
        {
            id: 'reports',
            title: 'Reports & Analytics',
            icon: 'fas fa-chart-pie',
            subModules: [
                { id: 'reports_financial', title: 'Financial Reports', icon: 'fas fa-file-invoice-dollar' },
                { id: 'reports_sales', title: 'Sales Reports', icon: 'fas fa-chart-line' },
                { id: 'reports_inventory', title: 'Inventory Reports', icon: 'fas fa-boxes' },
                { id: 'reports_hr', title: 'HR Reports', icon: 'fas fa-users' },
                { id: 'reports_production', title: 'Production Reports', icon: 'fas fa-industry' },
                { id: 'reports_custom', title: 'Custom Reports', icon: 'fas fa-edit' },
                { id: 'reports_scheduler', title: 'Report Scheduler', icon: 'fas fa-clock' },
                { id: 'reports_dashboards', title: 'Dashboards', icon: 'fas fa-tachometer-alt' },
                { id: 'reports_export', title: 'Export Tools', icon: 'fas fa-file-export' },
                { id: 'reports_settings', title: 'Report Settings', icon: 'fas fa-cog' }
            ]
        }
    ],
    defaultModule: 'dashboard'
};

// Reusable ERP Menu Component
class ERPMenu {
    constructor(containerId, config) {
        this.container = document.getElementById(containerId);
        this.config = config;
        this.currentModule = config.defaultModule;
        this.subMenuTimeout = null;
        this.hideSubMenuTimeout = null;
        
        this.init();
        this.addEventListeners();
    }
    
    init() {
        // Create menu structure
        this.container.innerHTML = '';
        
        // Create main tabs container
        const mainTabs = document.createElement('div');
        mainTabs.className = 'erp-main-tabs';
        mainTabs.id = 'erpMainTabs';
        
        // Create sub-menu container
        const subMenu = document.createElement('div');
        subMenu.className = 'erp-sub-menu';
        subMenu.id = 'erpSubMenu';
        
        // Assemble the menu
        this.container.appendChild(mainTabs);
        this.container.appendChild(subMenu);
        
        // Render main tabs
        this.renderMainTabs();
        
        // Set initial module
        this.switchToModule(this.currentModule);
    }
    
    renderMainTabs() {
        const mainTabsContainer = document.getElementById('erpMainTabs');
        mainTabsContainer.innerHTML = '';
        
        this.config.modules.forEach(module => {
            const tab = document.createElement('div');
            tab.className = `erp-main-tab ${module.id === this.currentModule ? 'active' : ''}`;
            tab.dataset.moduleId = module.id;
            tab.innerHTML = `
                <i class="${module.icon}"></i>
                <span>${module.title}</span>
            `;
            
            mainTabsContainer.appendChild(tab);
        });
    }
    
    renderSubMenu(moduleId) {
        const subMenuContainer = document.getElementById('erpSubMenu');
        const module = this.config.modules.find(m => m.id === moduleId);
        
        if (!module) return;
        
        // Clear any existing timeout
        if (this.hideSubMenuTimeout) {
            clearTimeout(this.hideSubMenuTimeout);
            this.hideSubMenuTimeout = null;
        }
        
        // Show sub-menu
        subMenuContainer.classList.add('show');
        
        // Create sub-tabs container
        const subTabsContainer = document.createElement('div');
        subTabsContainer.className = 'erp-sub-tabs-container';
        
        // Add sub-modules
        module.subModules.forEach(subModule => {
            const subTab = document.createElement('div');
            subTab.className = 'erp-sub-tab';
            subTab.dataset.subModuleId = subModule.id;
            subTab.innerHTML = `
                <i class="${subModule.icon}"></i>
                <span>${subModule.title}</span>
            `;
            
            subTabsContainer.appendChild(subTab);
        });
        
        // Update sub-menu content
        subMenuContainer.innerHTML = '';
        subMenuContainer.appendChild(subTabsContainer);
    }
    
    hideSubMenu() {
        const subMenuContainer = document.getElementById('erpSubMenu');
        subMenuContainer.classList.remove('show');
    }
    
    addEventListeners() {
        // Main tab mouseover events
        document.addEventListener('mouseover', (e) => {
            const mainTab = e.target.closest('.erp-main-tab');
            if (mainTab) {
                const moduleId = mainTab.dataset.moduleId;
                
                // Clear any existing timeout
                if (this.subMenuTimeout) {
                    clearTimeout(this.subMenuTimeout);
                }
                
                // Show sub-menu after a small delay
                this.subMenuTimeout = setTimeout(() => {
                    this.highlightMainTab(moduleId);
                    this.renderSubMenu(moduleId);
                }, 150);
            }
        });
        
        // Main tab mouseout events
        document.addEventListener('mouseout', (e) => {
            const mainTab = e.target.closest('.erp-main-tab');
            if (mainTab) {
                // Clear show timeout
                if (this.subMenuTimeout) {
                    clearTimeout(this.subMenuTimeout);
                    this.subMenuTimeout = null;
                }
            }
        });
        
        // Sub-menu mouseover events
        document.addEventListener('mouseover', (e) => {
            const subMenu = e.target.closest('.erp-sub-menu');
            if (subMenu) {
                // Clear any hide timeout
                if (this.hideSubMenuTimeout) {
                    clearTimeout(this.hideSubMenuTimeout);
                    this.hideSubMenuTimeout = null;
                }
            }
        });
        
        // Sub-menu mouseout events
        document.addEventListener('mouseout', (e) => {
            const subMenu = e.target.closest('.erp-sub-menu');
            const mainTab = e.target.closest('.erp-main-tab');
            
            if (subMenu && !mainTab) {
                // Set timeout to hide sub-menu
                this.hideSubMenuTimeout = setTimeout(() => {
                    this.hideSubMenu();
                }, 300);
            }
        });
        
        // Main tab click events
        document.addEventListener('click', (e) => {
            const mainTab = e.target.closest('.erp-main-tab');
            if (mainTab) {
                const moduleId = mainTab.dataset.moduleId;
                this.switchToModule(moduleId);
                
                // Clear any timeouts
                if (this.subMenuTimeout) {
                    clearTimeout(this.subMenuTimeout);
                    this.subMenuTimeout = null;
                }
                
                if (this.hideSubMenuTimeout) {
                    clearTimeout(this.hideSubMenuTimeout);
                    this.hideSubMenuTimeout = null;
                }
            }
        });
        
        // Sub-tab click events
        document.addEventListener('click', (e) => {
            const subTab = e.target.closest('.erp-sub-tab');
            if (subTab) {
                const subModuleId = subTab.dataset.subModuleId;
                
                // Call the global function with the menu option ID
                if (typeof CallScreen === 'function') {
                    CallScreen(subModuleId);
                } else {
                    console.error('CallScreen function not found');
                }
                
                // Hide sub-menu after click
                this.hideSubMenu();
            }
        });
    }
    
    switchToModule(moduleId) {
        this.currentModule = moduleId;
        
        // Update main tabs
        document.querySelectorAll('.erp-main-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.moduleId === moduleId) {
                tab.classList.add('active');
            }
        });
        
        // Render sub-menu for current module
        this.renderSubMenu(moduleId);
    }
    
    highlightMainTab(moduleId) {
        document.querySelectorAll('.erp-main-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.moduleId === moduleId) {
                tab.classList.add('active');
            }
        });
    }
    
    getCurrentModule() {
        return this.currentModule;
    }
}

// Initialize the ERP Menu when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const erpMenu = new ERPMenu('erpMenu', erpMenuConfig);
});

