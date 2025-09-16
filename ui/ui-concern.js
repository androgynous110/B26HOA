import { fetchConcerns, createConcern, resolveConcern, deleteConcern, userfetchConcerns } from '../api/api-concerns.js';
import { SoundManager } from '../utils/soundManager.js';
import { generateNotification } from '../api/api-notification.js'
import { getConcernStatusColor } from '../utils/colorStatus.js';
import { logoutUser } from '../api/auth-guard.js';


const concern = (() => {
  const staff = () => {
    let currentStatus = 'all';

    const init = () => {
      const statusFilter = document.getElementById("concernStatusFilter");
      if (statusFilter) {
        statusFilter.addEventListener("change", async (e) => {
          currentStatus = e.target.value;
          await renderConcerns();
        });
      }

      renderConcerns();

      const form = document.getElementById('concernForm');
      if (form) form.addEventListener('submit', handleSubmit);
    };

    const openForm = () => {
      document.getElementById('createConcernModal').classList.add("active");
    };

    const closeForm = () => {
      document.getElementById('createConcernModal').style.display = 'none';
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      const title = document.getElementById('concernTitle').value;
      const message = document.getElementById('concernMessage').value;
      const homeowner_id = document.getElementById('concernHomeownerId').value;

      try {
        await createConcern(title, message, homeowner_id);
        closeForm();
        await renderConcerns();
      } catch (error) {
        console.error('Error submitting concern:', error);
        alert('Failed to submit concern.');
      }
    };

    const renderConcerns = async () => {
      try {
        const concerns = await fetchConcerns(currentStatus);
        renderCard(concerns);
        renderTable(concerns);
      } catch (error) {
        console.error('Error loading concerns:', error);
      }
    };

    const renderTable = (data) => {
      const tbody = document.getElementById('concernTable');

      if (!data || data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 1rem;">
              <i class="fa fa-box-open" style="font-size: 30px; color: #888;"></i>
              <div style="margin-top: 0.5rem; color: #888;">No concerns found.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(c => `
        <tr>
          <td>${c.title}</td>
          <td>${c.message}</td>
          <td>${c.full_name || ''}</td>
          <td>${new Date(c.created_at).toLocaleString()}</td>
          <td>${c.category || ''}</td>
          <td>
            <button style="font-weight:bold; padding: 5px 5px; border: none; background-color:${getConcernStatusColor(c.is_resolved ? 'Resolved' : 'Unresolved')}; color: white; border-radius: 0px; cursor: pointer;">
              ${c.is_resolved ? 'Resolved' : 'Unresolved'}
            </button>
          </td>
          <td>
            ${!c.is_resolved
              ? `<button onclick="concern.staff().markResolved('${c.id}', '${c.homeowner_id}')" class="mark-resolve-btn">Resolve</button>`
              : ''}
            <button onclick="concern.staff().markDelete('${c.id}')" class="mark-delete-btn">Delete</button>
          </td>
        </tr>
      `).join('');
    };

    const renderCard = (data) => {
      const container = document.getElementById('concernCardView');

      if (!data || data.length === 0) {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; justify-content: center;
                    align-items: center; height: 200px; color: #888;">
            <i class='fa fa-box-open' style='font-size: 70px;'></i>
            <span style='margin-top: 0.5rem;'>No concerns found.</span>
          </div>
        `;
        return;
      }

      container.innerHTML = data.map(c => `
        <div class="concern-card">
          <h4>Concern: ${c.title}</h4>
          <p><strong>Description:</strong> ${c.message}</p>
          <p><strong>Homeowner:</strong> ${c.full_name || ''}</p>
          <p><strong>Date:</strong> ${new Date(c.created_at).toLocaleString()}</p>
          <p><strong>Category:</strong> ${c.category || ''}</p>
          <p><strong>Status:</strong>
            <button style="font-weight:bold; padding: 5px; border: none; background-color:${getConcernStatusColor(c.is_resolved ? 'Resolved' : 'Unresolved')}; color: white; border-radius: 0px; cursor: pointer; margin-left:5px;">
              ${c.is_resolved ? 'Resolved' : 'Unresolved'}
            </button>
          </p>
          <div class="card-actions">
            ${!c.is_resolved
              ? `<button onclick="concern.staff().markResolved('${c.id}', '${c.homeowner_id}')" class="mark-resolve-btn">Resolve</button>`
              : ''}
            <button onclick="concern.markDelete('${c.id}')" class="mark-delete-btn">Delete</button>
          </div>
        </div>
      `).join('');
    };

    const markResolved = async (id, homeowner_id) => {
      try {
        await resolveConcern(id);
        await renderConcerns();
        generateNotification("Concern is Resolved!", `The staff has successfully solved your concern.`, "dues", homeowner_id);
        SoundManager.playConfirmation();
      } catch (error) {
        console.error('Error resolving concern:', error);
      }
    };

    const markDelete = async (id) => {
      try {
        await deleteConcern(id);
        SoundManager.playDelete();
        await renderConcerns();
      } catch (error) {
        console.error('Error deleting concern:', error);
      }
    };

    const switchView = (viewType) => {
      const listView = document.getElementById('concernListView');
      const cardView = document.getElementById('concernCardView');

      if (viewType === 'list') {
        listView.style.display = 'table';
        cardView.style.display = 'none';
      } else {
        listView.style.display = 'none';
        cardView.style.display = 'block';
      }
    };

    return {
      init,
      openForm,
      closeForm,
      handleSubmit,
      markResolved,
      markDelete,
      switchView,
    };
  }
  const member = () => {
    let currentStatus = 'all';

    const init = () => {
      const statusFilter = document.getElementById("concernStatusFilter");
      if (statusFilter) {
        statusFilter.addEventListener("change", async (e) => {
          currentStatus = e.target.value;
          await renderConcerns();
        });
      }

      renderConcerns();

      const form = document.getElementById('concernForm');
      if (form) form.addEventListener('submit', handleSubmit);
    };

    const openForm = () => {
      document.getElementById('createConcernModal').classList.add("active");
    };

    const closeForm = () => {
      document.getElementById('createConcernModal').style.display = 'none';
    };

    const handleSubmit = async (event) => {
      event.preventDefault();
      const title = document.getElementById('concernTitle').value;
      const message = document.getElementById('concernMessage').value;
      const category = document.getElementById('concernCategory').value;
      const userProfile = JSON.parse(localStorage.getItem('user'));
      const homeowner_id = userProfile?.id;

      try {
        await createConcern(title, message, category, homeowner_id);
        closeForm();
        SoundManager.playConfirmation();
        await renderConcerns();
      } catch (error) {
        console.error('Error submitting concern:', error);
        alert('Failed to submit concern.');
      }
    };

    const renderConcerns = async () => {
      const userProfile = JSON.parse(localStorage.getItem('user'));
      const user_id = userProfile?.id;
      try {
        const concerns = await userfetchConcerns(user_id, currentStatus);
        renderCard(concerns);
        renderTable(concerns);
      } catch (error) {
        console.error('Error loading concerns:', error);
      }
    };

    const renderTable = (data) => {
      const tbody = document.getElementById('concernTable');

      if (!data || data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 1rem;">
              <i class="fa fa-box-open" style="font-size: 30px; color: #888;"></i>
              <div style="margin-top: 0.5rem; color: #888;">No concerns found.</div>
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = data.map(c => `
        <tr>
          <td>${c.title}</td>
          <td>${c.message}</td>
          <td>${c.full_name || ''}</td>
          <td>${new Date(c.created_at).toLocaleString()}</td>
          <td>${c.category || ''}</td>
          <td>
            <button style="font-weight:bold; padding: 5px 5px; border: none; background-color:${getConcernStatusColor(c.is_resolved ? 'Resolved' : 'Unresolved')}; color: white; border-radius: 0px; cursor: pointer;">
              ${c.is_resolved ? 'Resolved' : 'Unresolved'}
            </button>
          </td>
          <td>
            <button onclick="concern.member().markDelete('${c.id}')" class="mark-delete-btn">Delete</button>
          </td>
        </tr>
      `).join('');
    };

    const renderCard = (data) => {
      const container = document.getElementById('concernCardView');

      if (!data || data.length === 0) {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; justify-content: center;
                    align-items: center; height: 200px; color: #888;">
            <i class='fa fa-box-open' style='font-size: 70px;'></i>
            <span style='margin-top: 0.5rem;'>No concerns found.</span>
          </div>
        `;
        return;
      }

      container.innerHTML = data.map(c => `
        <div class="concern-card">
          <h4>Concern: ${c.title}</h4>
          <p><strong>Description:</strong> ${c.message}</p>
          <p><strong>Homeowner:</strong> ${c.full_name || ''}</p>
          <p><strong>Date:</strong> ${new Date(c.created_at).toLocaleString()}</p>
          <p><strong>Category:</strong> ${c.category || ''}</p>
          <p><strong>Status:</strong>
            <button style="font-weight:bold; padding: 5px; border: none; background-color:${getConcernStatusColor(c.is_resolved ? 'Resolved' : 'Unresolved')}; color: white; border-radius: 0px; cursor: pointer; margin-left:5px;">
              ${c.is_resolved ? 'Resolved' : 'Unresolved'}
            </button>
          </p>
          <div class="card-actions">
            ${!c.is_resolved
              ? `<button onclick="concern.markResolved('${c.id}')" class="mark-resolve-btn">Resolve</button>`
              : ''}
            <button onclick="concern.markDelete('${c.id}')" class="mark-delete-btn">Delete</button>
          </div>
        </div>
      `).join('');
    };

    const markDelete = async (id) => {
      try {
        await deleteConcern(id);
        await renderConcerns();
        SoundManager.playDelete();
      } catch (error) {
        console.error('Error deleting concern:', error);
      }
    };

    const switchView = (viewType) => {
      const listView = document.getElementById('concernListView');
      const cardView = document.getElementById('concernCardView');

      if (viewType === 'list') {
        listView.style.display = 'table';
        cardView.style.display = 'none';
      } else {
        listView.style.display = 'none';
        cardView.style.display = 'block';
      }
    };

    return {
      init,
      openForm,
      closeForm,
      handleSubmit,
      markDelete,
      switchView,
    };
  }
  return { staff, member };
})();

export default concern;
window.concern = concern;

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
      concern.staff().init();
      break;
    case 'secretary':
      concern.staff().init();
      break;
    case 'vice_president':
      concern.staff().init();
      break;
    case 'auditor':
      concern.staff().init();
      break;
    case 'treasurer':
      concern.staff().init();
      break;
    case 'member':
      concern.member().init();
      break;
    default:
      logoutUser();
  }
});
