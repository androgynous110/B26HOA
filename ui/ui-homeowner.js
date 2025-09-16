import {fetchHomeowners, createHomeowner, updateHomeowner, deleteHomeowner} from '../api/api-homeowner.js';
import { SoundManager } from '../utils/soundManager.js';
import { getHomeownerStatusColor } from '../utils/colorStatus.js';
import { createUserAccount, deleteUserAccount } from '../api-users.js';

const homeowner = (() => {
  let allHomeowners = [];

  const init = () => {
    document.addEventListener('DOMContentLoaded', () => {
      if (!document.getElementById('homeownerTbody')) return;

      loadHomeowners();

      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        searchInput.addEventListener('input', (e) =>
          loadHomeowners(e.target.value.trim())
        );
      }

      const statusFilter = document.getElementById('statusFilter');
      if (statusFilter) {
        statusFilter.addEventListener('change', () =>
          loadHomeowners(document.getElementById('searchInput').value.trim())
        );
      }

      const editForm = document.getElementById('editHomeownerForm');
      if (editForm) {
        editForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await saveEditHomeowner();
        });
      }

      const createForm = document.getElementById('createHomeownerForm');
      if (createForm) {
        createForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await saveNewHomeowner();
        });
      }

      const togglePassword = document.getElementById('userTogglePassword');
      const passwordInput = document.getElementById('userPassword');

      if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
          const isHidden = passwordInput.getAttribute('type') === 'password';
          passwordInput.setAttribute('type', isHidden ? 'text' : 'password');

          togglePassword.classList.toggle('fa-eye');
          togglePassword.classList.toggle('fa-eye-slash');
          togglePassword.setAttribute('title', isHidden ? 'Hide Password' : 'Show Password');

          togglePassword.classList.remove('clicked');
          void togglePassword.offsetWidth;
          togglePassword.classList.add('clicked');
        }, { passive: true });
      }


      const createUserForm = document.getElementById('createUserForm');
      if (createUserForm) {
        createUserForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const user = await createUser();
          if (user && user.id) {
            await saveNewHomeowner(user.id);
          } else {
            console.error('Failed to create user or user ID is missing');
            SoundManager.playError();
            alert('Failed to create user account. Please try again.');
          }
        });
      }

      const closeEdit = document.getElementById('closeEditModal');
      if (closeEdit) closeEdit.addEventListener('click', closeEditModal);

      const closeCreate = document.getElementById('closeCreateModal');
      if (closeCreate) closeCreate.addEventListener('click', closeCreateModal);
    });
  };

  const loadHomeowners = async (search = '') => {
    const status = document.getElementById('statusFilter')?.value || '';
      allHomeowners = await fetchHomeowners(search, status);
      renderTable(allHomeowners);
      renderCard(allHomeowners);
    };

  const renderTable = (data) => {
    const tbody = document.getElementById('homeownerTbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
            <td colspan="10" style="padding: 2rem;">
              <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 90%;
              ">
                <i class="fa fa-box-open" style="font-size: 30px; color: #888;"></i>
                <div style="margin-top: 0.5rem; color: #888;">No records found.</div>
              </div>
            </td>
          </tr>`;
      return;
    }

    data.forEach((h) => {
    const fullName = `${h.first_name} ${h.middle_name || ''} ${h.last_name}`.trim();
    const statusColor = getHomeownerStatusColor(h.status);

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${fullName}</td>
      <td>${h.email}</td>
      <td>${h.contact_info}</td>
      <td>
        <button style="font-weight:bold; padding: 5px 5px; border: none; background-color:${statusColor}; color: white; border-radius: 0px; cursor: pointer;">${h.status}</button></td>
      </td>
      <td><strong>${h.type_user}</strong></td>
      <td>
        <button class="edit-btn" onclick="homeowner.editHomeowner('${h.id}')"><i class="fas fa-edit"></i> Edit</button>
        <button class="delete-btn" onclick="homeowner.deleteHomeowner('${h.id}')"><i class="fas fa-trash-alt"></i> Delete</button>
      </td>`;
    tbody.appendChild(row);
  });
};

  const renderCard = (data) => {
    const container = document.getElementById('homeownerCardView');
    if (!container) return;

    container.innerHTML = '';
    if (!data.length) {
      container.innerHTML = `<p style="text-align:center;">No homeowners found.</p>`;
      return;
    }

    data.forEach((h) => {
      const fullName = `${h.first_name} ${h.middle_name || ''} ${h.last_name}`.trim();
      const card = document.createElement('div');
      card.className = 'homeowner-card';
      card.innerHTML = `
        <h4 class="classHeader">Name: ${fullName}</h4>
        <p style="margin-left:25px;"><strong>Email: </strong>${h.email}</p>
        <p style="margin-left:25px;"><strong>Contact Info: </strong>${h.contact_info}</p>
        <p style="margin-left:25px;"><strong>Status: </strong>${h.status}</p>
        <p style="margin-left:25px;"><strong>Account Created: </strong>${h.created_at}</p>
        <div class="card-actions">
          <button class="edit-btn" style="margin-top:1.5rem;" onclick="homeowner.editHomeowner('${h.id}')">Edit</button>
          <button class="delete-btn" style="margin-top:1.5rem;" onclick="homeowner.deleteHomeowner('${h.id}')">Delete</button>
        </div>`;
      container.appendChild(card);
    });
  };

  const editHomeowner = (id) => {
    const home = allHomeowners.find((h) => h.id === id);
    if (!home) return;

    document.getElementById('editId').value = home.id;
    document.getElementById('editFname').value = home.first_name;
    document.getElementById('editMname').value = home.middle_name;
    document.getElementById('editLname').value = home.last_name;
    document.getElementById('editEmail').value = home.email;
    document.getElementById('editContact').value = home.contact_info;
    document.getElementById('editTypeUser').value = home.type_user;
    document.getElementById('editStatus').value = home.status;

    document.getElementById('editHomeownerModal').classList.add('active');
  };

  const saveEditHomeowner = async () => {
    const id = document.getElementById('editId').value;
    const first_name = document.getElementById('editFname').value.trim();
    const middle_name = document.getElementById('editMname').value.trim();
    const last_name = document.getElementById('editLname').value.trim();
    const email = document.getElementById('editEmail').value.trim();
    const contact_info = document.getElementById('editContact').value.trim();
    const type_user = document.getElementById('editTypeUser').value;
    const status = document.getElementById('editStatus').value;
    

    await updateHomeowner(id, { first_name, middle_name, last_name, email, contact_info, type_user, status });
    closeEditModal();
    loadHomeowners();
    SoundManager.playConfirmation();
  };

  const saveNewHomeowner = async (userId) => {
    const first_name = document.getElementById('newFname').value.trim();
    const middle_name = document.getElementById('newMname').value.trim();
    const last_name = document.getElementById('newLname').value.trim();
    const email = document.getElementById('homeownerEmail').value.trim();
    const contact_info = document.getElementById('homeownerContact').value.trim();
    const type_user = document.getElementById('typeUser').value;
    const status = document.getElementById('newStatus').value;
    console.log(userId);
    try {
        await createHomeowner({
        id: userId, 
        first_name,
        middle_name,
        last_name,
        email,
        contact_info,
        type_user,
        status
      });


      closeCreateModal();
      loadHomeowners();
      SoundManager.playConfirmation();
    } catch (error) {
      SoundManager.playError();
      console.error('Error creating homeowner:', error);
    }
  };

  const showPassword = () => {
    const togglePassword = document.getElementById('userTogglePassword');
    const passwordInput = document.getElementById('userPassword');

    if (togglePassword && passwordInput) {
      togglePassword.addEventListener('click', () => {
        const isHidden = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isHidden ? 'text' : 'password');

        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
        togglePassword.setAttribute('title', isHidden ? 'Hide Password' : 'Show Password');

        togglePassword.classList.remove('clicked');
        void togglePassword.offsetWidth;
        togglePassword.classList.add('clicked');
      }, { passive: true });
    }
  };

  const createUser = async () => {
    const username = document.getElementById('userName')?.value.trim();
    const password = document.getElementById('userPassword')?.value.trim();
    const email = document.getElementById('userEmail')?.value.trim();
    const contact = document.getElementById('userContact')?.value.trim();

    if (!username || !password || !email || !contact) {
      console.error('Missing required fields:', { username, password, email, contact });
      alert('Please fill in all required fields.');
      return null;
    }

    try {
      const user = await createUserAccount(email, password, username, 'member', contact);
      console.log('createUserAccount response:', user);
      return user;
    } catch (error) {
      console.error('Error creating user account:', error.message, error.stack);
      alert('Failed to create user account: ' + error.message);
      return null;
    }
  };

  const deleteUser = async (id) => {
    try{
      await deleteUserAccount(id);
    } catch (error) {
      console.log('Error deleting user: ', error.message)
    }
  }

  const deleteHomeownerById = async (id) => {
    if (confirm('Delete this homeowner?')) {
      await deleteHomeowner(id);
      deleteUser(id);
      loadHomeowners();
      SoundManager.playDelete();
    }
  };

  const switchView = (view) => {
    document.getElementById('homeownerListView').style.display = view === 'list' ? 'table' : 'none';
    document.getElementById('homeownerCardView').style.display = view === 'card' ? 'grid' : 'none';
  };

  const closeEditModal = () => {
    document.getElementById('editHomeownerModal').classList.remove('active');
  };

  const closeCreateModal = () => {
    document.getElementById('createHomeownerModal').classList.remove('active');
  };

  const openForm = () => {
    document.getElementById('createHomeownerModal').classList.add('active');
  };

  return {
    init,
    switchView,
    editHomeowner,
    showPassword,
    deleteHomeowner: deleteHomeownerById,
    deleteUser,
    closeEditModal,
    closeCreateModal,
    openForm
  };
})();

homeowner.init();
window.homeowner = homeowner;