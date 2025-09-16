import { fetchConcerns } from './api-concerns.js';
import { fetchDues } from './api-dues.js';
import { colorConfig } from '../utils/colorStatus.js';
import { logoutUser } from './auth-guard.js';
const dashboard = (() => {

  const renderPieChart = async () => {
    const container = document.getElementById('pie-chart');
    if (!container) {
      console.error('Pie chart container not found.');
      return;
    }

    try {
      const dues = await fetchDues();
      if (!dues || !Array.isArray(dues)) {
        container.innerHTML = '<p>Error loading chart data.</p>';
        return;
      }

      const complete = dues.filter(d => d.status === "Complete").length;
      const onGoing = dues.filter(d => d.status === "On going").length;
      const overdue = dues.filter(d => d.status === "Overdue").length;

      const pieData = [
        { x: "Overdue", value: overdue },
        { x: "Paid", value: complete },
        { x: "Ongoing", value: onGoing }
      ];

      const pieChart = anychart.pie(pieData);
      pieChart.innerRadius('65%');

      const palette = anychart.palettes.distinctColors();
      palette.items([
        { color: '#FF0000' },
        { color: '#008000' },
        { color: '#FFA500' } 
      ]);
      pieChart.palette(palette);

      pieChart.labels()
        .format('{%x} — {%percent}%')
        .fontSize(12)
        .fontColor('#ffff')
        .fontWeight('bold');

      pieChart.tooltip()
        .useHtml(true)
        .titleFormat('<span style="font-size:13px; font-weight:bold;">{%x}</span>')
        .format(`
          <span style="color: #ffff;">Homeowners:</span> <span style="color: #ffff; font-weight: bold;">{%value}</span><br>
          <span style="color: #ffff;">Percent:</span> <span style="color: #ffff; font-weight: bold;">{%percentValue}{decimalsCount:1}%</span>
        `);

      const label = anychart.standalones.label();
      label.useHtml(true)
        .text('<span style="color:#313136;font-size:18px;font-weight:bold;">Homeowners\'<br>Payment<br>Status</span>')
        .position('center')
        .anchor('center')
        .hAlign('center')
        .vAlign('middle');

      pieChart.center().content(label);
      pieChart.container('pie-chart').draw();
    } catch (error) {
      console.error('Error rendering pie chart:', error);
      container.innerHTML = '<p>Error loading chart.</p>';
    }
  };

  const renderDebtChart = async (year = new Date().getFullYear()) => {
const container = document.getElementById('line-chart');
    if (!container) {
      console.error('Line chart container not found.');
      return;
    }

    try {
      const dues = await fetchDues();
      if (!dues || !Array.isArray(dues)) {
        container.innerHTML = '<p>Error loading chart data.</p>';
        return;
      }

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlySums = new Array(12).fill(0);
      const yearlySums = new Array(12).fill(0);

      dues.forEach(due => {
        const date = new Date(due.due_date);
        if (date.getFullYear() === year) {
          const month = date.getMonth();
          const amount = parseFloat(due.paid_amount);
          if (!isNaN(amount)) {
            if (due.type === 'Monthly') {
              monthlySums[month] += amount;
            } else if (due.type === 'Yearly') {
              yearlySums[month] += amount;
            }
          }
        }
      });

      const chartData = monthNames.map((name, idx) => {
        const monthly = monthlySums[idx];
        const yearly = yearlySums[idx];
        const total = monthly + yearly;
        return [name, monthly, yearly, total];
      });

      const dataSet = anychart.data.set(chartData);
      const chart = anychart.line();

      // Set width and height to match CSS container
      chart.width('100%');
      chart.height('100%');
      chart.animation(true);
      chart.padding([10, 20, 5, 20]); // Reduced right padding to fit width
      chart.title(`Debt Payments in ${year}`);
      chart.title().fontSize('18px');
      chart.title().fontWeight('bold');
      chart.title().fontColor('#313136');
      chart.title().hAlign('center');
      chart.title().padding([0, 0, 10, 0]); // Reduced padding to save space

      let maxValue = Math.max(...chartData.map(row => row[3]), 100);
      maxValue = Math.ceil(maxValue / 100) * 100;
      if (maxValue % 4 !== 0) maxValue += 4 - (maxValue % 4);
      const step = maxValue / 4;

      chart.yScale().minimum(0).maximum(maxValue);
      chart.yAxis().labels().format('${%Value}');
      chart.yAxis(1).enabled(true).orientation('right');
      chart.yAxis(1).labels().format('${%Value}');
      chart.legend().enabled(true).fontSize(12).padding([0, 0, 10, 0]); // Reduced font size and padding

      const firstSeriesData = dataSet.mapAs({ x: 0, value: 1 });
      const secondSeriesData = dataSet.mapAs({ x: 0, value: 2 });
      const thirdSeriesData = dataSet.mapAs({ x: 0, value: 3 });

      chart.line(firstSeriesData)
        .name('Monthly')
        .hovered().markers().enabled(true).type('circle').size(4);

      chart.line(secondSeriesData)
        .name('Yearly')
        .hovered().markers().enabled(true).type('circle').size(4);

      chart.line(thirdSeriesData)
        .name('Total')
        .hovered().markers().enabled(true).type('circle').size(4);

      // Adjust range markers to fit height
      chart.rangeMarker(0).from(0).to(step).fill('#4db6ac 0.4');
      chart.rangeMarker(1).from(step).to(step * 2).fill('#80cbc4 0.4');
      chart.rangeMarker(2).from(step * 2).to(step * 3).fill('#b2dfdb 0.4');
      chart.rangeMarker(3).from(step * 3).to(step * 4).fill('#e0f2f1 0.4');
      chart.container('line-chart');
      chart.draw();
    } catch (error) {
      console.error('Error rendering debt chart:', error);
      container.innerHTML = '<p>Error loading chart.</p>';
    }
  };

  const renderConcerns = async (date = new Date()) => {
    const pendingConcernsArea = document.getElementById('pendingConcernsArea');
    if (!pendingConcernsArea) {
      console.error("pendingConcernsArea not found.");
      return;
    }

    pendingConcernsArea.innerHTML = "<p>Loading concerns...</p>";

    try {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];

      const year = date.getFullYear();
      const month = date.getMonth();
      const monthName = monthNames[month];

      const concerns = await fetchConcerns("Unresolved");

      if (!Array.isArray(concerns)) {
        throw new Error("Invalid concerns data received");
      }

      const filtered = concerns.filter(c => {
        if (!c.created_at) return false;
        const created = new Date(c.created_at);
        return created.getFullYear() === year && created.getMonth() === month;
      });

      let html = `
        <h3 style="margin-bottom: 16px;">Pending Homeowner Concerns</h3>
      `;

      if (filtered.length === 0) {
        html += `<p>No concerns found for ${monthName} ${year}.</p>`;
      } else {
        filtered.forEach(concern => {
          const createdDate = new Date(concern.created_at).toLocaleDateString();

          html += `
            <div class="card" style="margin-bottom: 12px; border-left: 4px solid #4CAF50; padding: 12px; box-shadow: 4px 4px 10px rgba(0, 0, 0, 0.3); ">
              <div style="font-weight: bold; font-size: 1rem;">${concern.title || "No Title"}</div>
              <div>${concern.message || "No message"}</div>
              <div class="concern-recepient">Submitted by: ${concern.full_name || "Anonymous"}</div>
              <div class="concern-recepient">Date: ${createdDate}</div>
            </div>
          `;
        });
      }

      pendingConcernsArea.innerHTML = html;
    } catch (error) {
      console.error("Error rendering concerns:", error);
      pendingConcernsArea.innerHTML = `
        <div class="card">
          <div class="card-content">
            <h3>Pending Homeowner Concerns</h3>
            <p class="error">Error loading concerns: ${error.message}</p>
          </div>
        </div>
      `;
    }
  };

  const unpaidAccounts = async () => {
    const overdueHomeowners = document.getElementById('overdueHomeowners');
    if (!overdueHomeowners) {
      console.error("overdueHomeowners element not found.");
      return;
    }

    overdueHomeowners.innerHTML = "<p>Loading overdue homeowners...</p>";

    try {
      const dues = await fetchDues();
      if (!dues || !Array.isArray(dues)) {
        throw new Error("Invalid dues data received");
      }

      const homeowners = dues.filter(d => d.status === "Overdue");

      let html = `
        <h3 style="margin-bottom: 16px;">Due Unpaid Homeowners</h3>
      `;

      if (homeowners.length === 0) {
        html += `<p>No overdue homeowners found.</p>`;
      } else {
        const getStatusColor = (status) => colorConfig.status[status] || colorConfig.status._default;
        const getTypeColor = (type) => colorConfig.types[type] || colorConfig.types._default;

        html += homeowners
          .map(d => {
            const status = d.status || 'Pending Verification';
            const statusColor = getStatusColor(status);
            return `
              <div class="event-item">
                <strong style="all: unset; font-weight: bold;">
                  <span style="all: unset;">${d.full_name || "Unknown"}</span>
                  <span style="color: ${getTypeColor(d.type)};">(${d.type || "Unknown"} Due)</span>
                </strong>
                <strong>
                  <small>
                    Due Status: 
                    <span style="color: ${statusColor}; font-weight: bold; cursor: pointer;">
                      ${status}
                    </span>
                  </small>
                </strong>
                <strong>
                  <small>
                    Notes: 
                    <span style="font-weight: normal;">${d.note || 'No notes available'}</span>
                  </small>
                </strong>
              </div>
            `;
          })
          .join("");
      }

      overdueHomeowners.innerHTML = html;
    } catch (error) {
      console.error('Failed to load overdue homeowners:', error);
      overdueHomeowners.innerHTML = `
        <div class="card">
          <div class="card-content">
            <h3>Due Unpaid Homeowners</h3>
            <p class="error">Error loading overdue homeowners: ${error.message}</p>
          </div>
        </div>
      `;
    }
  };

  const init = () => {
    document.addEventListener('DOMContentLoaded', () => {
      const userProfile = JSON.parse(localStorage.getItem('user'));

      if (!userProfile || !userProfile.role) {
        console.error('No valid user profile found');
        window.location.assign('/login.html');
        return;
      }

      const role = userProfile.role.toLowerCase();

      switch (role) {
        case 'president':
          renderPieChart();
          renderDebtChart();
          renderConcerns();
          break;
        case 'vice_president':
          renderPieChart();
          renderDebtChart();
          renderConcerns();
          break;
        case 'secretary':
          renderPieChart();
          renderDebtChart();
          renderConcerns();
          break;
        case 'auditor':
          renderPieChart();
          renderDebtChart();
          unpaidAccounts();
          break;
        case 'treasurer':
          renderPieChart();
          renderDebtChart();
          unpaidAccounts();
          break;
        case 'member':
          break;
        default:
          logoutUser();
      }
    });
  };

  return {
    init
  };
})();

dashboard.init();