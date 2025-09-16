import { fetchAnnouncements, fetchCategories, createAnnouncement, markAsRead, deleteAnnouncement, createCategory, userfetchAnnouncements } from '../api/api-announcement.js';
import { BadgeManager } from "../utils/badgeManager.js";
import { SoundManager } from '../utils/soundManager.js';
import { getStatusColor } from '../utils/colorStatus.js';
import { logoutUser } from '../api/auth-guard.js';

const announcement = (() => {
  const userProfile = JSON.parse(localStorage.getItem('user'));
  const user_id = userProfile?.id;

  const staff = () => {
    let currentCategory = '';

    const init = () => {
      loadCategories();
      loadAnnouncements();

      const categoryFilter = document.getElementById('categoryFilter');
      if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
          currentCategory = e.target.value;
          loadAnnouncements();
        });
      }

      const announcementForm = document.getElementById('announcementForm');
      if (announcementForm) {
        announcementForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await handleSubmit();
        });
      }

      const categoryForm = document.getElementById('categoryForm');
      if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await handleCategorySubmit();
        });
      }
    };

    const announcementSection = async () => {
      const data = await fetchAnnouncements(currentCategory);
      renderTable(data, false);
      renderCard(data, false);
      const unreadCount = data.filter((a) => !a.is_read).length;
      BadgeManager.updateBadge('announcementBadge', unreadCount);
    };

    const loadCategories = async () => {
      const categories = await fetchCategories();
      const categoryFilter = document.getElementById('categoryFilter');
      const announcementCategory = document.getElementById('announcementCategory');

      if (categoryFilter && announcementCategory) {
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        announcementCategory.innerHTML = '<option value="">Select Category</option>';

        categories.forEach((cat) => {
          categoryFilter.insertAdjacentHTML('beforeend', `<option value="${cat.id}">${cat.name}</option>`);
          announcementCategory.insertAdjacentHTML('beforeend', `<option value="${cat.id}">${cat.name}</option>`);
        });
      }
    };

    const loadAnnouncements = async () => {
      const data = await fetchAnnouncements(currentCategory);
      renderTable(data, true);
      renderCard(data, true);
      const unreadCount = data.filter((a) => !a.is_read).length;
      BadgeManager.updateBadge('announcementBadge', unreadCount);
    };

    const renderTable = (data, allowActions = true) => {
      const tbody = document.getElementById('announcementTable');
      if (!tbody) return;

      tbody.innerHTML = '';

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="${allowActions ? 5 : 4}" style="height: 200px; padding: 1rem;">
              <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: #888;">
                <i class="fa fa-box-open" style="font-size: 70px;"></i>
                <span style="margin-top: 0.5rem;">No announcement found.</span>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      data.forEach((a) => {
        tbody.insertAdjacentHTML('beforeend', `
          <tr>
            <td>${a.announcement_title}</td>
            <td>${a.message}</td>
            <td>${new Date(a.created_at).toLocaleString()}</td>
            <td>${a.announcement_categories?.name || 'Uncategorized'}</td>
            <td>
              <button style="font-weight:bold; padding: 5px; border: none; background-color:${getStatusColor(a.is_read ? 'Read' : 'Unread')}; color: white;">
                ${a.is_read ? 'Read' : 'Unread'}
              </button>
            </td>
            ${allowActions ? `
              <td>
                <button style="padding: 5px 5px 5px 5px;" class="mark-read-btn announcement-read-btn" data-id="${a.id}"><i class="fas fa-eye"></i> Read</button>
                <button style="padding: 5px 5px 5px 5px;" class="mark-delete-btn announcement-delete-btn" data-id="${a.id}"><i class="fas fa-trash-alt"></i> Delete</button>
              </td>
            ` : ''}
          </tr>
        `);
      });

      if (allowActions) {
        tbody.querySelectorAll('.announcement-read-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            markRead(btn.dataset.id);
          });
        });
        tbody.querySelectorAll('.announcement-delete-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            deleteAnnouncementById(btn.dataset.id);
          });
        });
      }
    };

    const renderCard = (data, allowActions = true) => {
      const container = document.getElementById('announcementCardView');
      if (!container) return;

      container.innerHTML = '';

      if (!data.length) {
        container.innerHTML = '<p>No announcements found.</p>';
        return;
      }

      data.forEach((a) => {
        container.insertAdjacentHTML('beforeend', `
          <div class="announcement-card">
            <h4>Title: ${a.announcement_title}</h4>
            <p><strong>Message: </strong>${a.message}</p>
            <p><strong>Date created: </strong>${new Date(a.created_at).toLocaleString()}</p>
            <p><strong>Category: </strong>${a.announcement_categories?.name || 'Uncategorized'}</p>
            <p><strong>Status: </strong>
              <button style="font-weight:bold; padding: 5px; border: none; background-color:${getStatusColor(a.is_read ? 'Read' : 'Unread')}; color: white; border-radius: 0px;">
                ${a.is_read ? 'Read' : 'Unread'}
              </button>
            </p>
            ${allowActions ? `
              <div class="card-actions">
                <button class="mark-read-btn announcement-read-btn" data-id="${a.id}" style="background-color: #228116; color: white; border: none;  padding: 5px 5px 5px 5px; border-radius: 3px;"><i class="fas fa-eye"></i> Read</button>
                <button class="mark-delete-btn announcement-delete-btn" data-id="${a.id}" style="background-color: #f44336; color: white; border: none;  padding: 5px 5px 5px 5px; border-radius: 3px;"><i class="fas fa-trash-alt"></i> Delete</button>
              </div>
            ` : ''}
          </div>
        `);
      });

      if (allowActions) {
        container.querySelectorAll('.announcement-read-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            markRead(btn.dataset.id);
          });
        });
        container.querySelectorAll('.announcement-delete-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            deleteAnnouncementById(btn.dataset.id);
          });
        });
      }
    };

    const handleSubmit = async () => {
      const title = document.getElementById('announcementTitle')?.value.trim();
      const message = document.getElementById('announcementMessage')?.value.trim();
      const category_id = document.getElementById('announcementCategory')?.value;

      if (!title || !message || !category_id || !user_id) return;

      try {
        await createAnnouncement(title, message, category_id, user_id);
        document.getElementById('announcementForm')?.reset();
        closeForm();
        await loadAnnouncements();
        SoundManager.playNotification();
      } catch (err) {
        console.error('Failed to create announcement:', err);
        SoundManager.playError();
      }
    };

    const handleCategorySubmit = async () => {
      const name = document.getElementById('newCategory')?.value.trim();
      if (!name) return;

      try {
        await createCategory(name);
        document.getElementById('categoryForm')?.reset();
        await loadCategories();
        closeForm();
        SoundManager.playNotification();
      } catch (err) {
        console.error('Failed to create category:', err);
      }
    };

    const markRead = async (id) => {
      try {
        await markAsRead(id);
        await loadAnnouncements();
        SoundManager.playConfirmation();
      } catch (err) {
        console.error('Failed to mark announcement as read:', err);
      }
    };

    const deleteAnnouncementById = async (id) => {
      try {
        await deleteAnnouncement(id);
        await loadAnnouncements();
        SoundManager.playDelete();
      } catch (err) {
        console.error('Failed to delete announcement:', err);
      }
    };

    const switchView = (view) => {
      const listView = document.getElementById('announcementListView');
      const cardView = document.getElementById('announcementCardView');
      if (listView && cardView) {
        listView.style.display = view === 'list' ? 'table' : 'none';
        cardView.style.display = view === 'card' ? 'grid' : 'none';
      }
    };

    const openForm = () => document.getElementById('createAnnouncementModal')?.classList.add('active');
    const closeForm = () => {
      document.getElementById('createAnnouncementModal')?.classList.remove('active');
      document.getElementById('createCategorySection')?.classList.remove('active');
    };
    const addAnnouncementCategory = () => document.getElementById('createCategorySection')?.classList.add('active');
    const closeCategory = () => document.getElementById('createCategorySection')?.classList.remove('active');

    return {
      init,
      announcementSection,
      openForm,
      closeForm,
      closeCategory,
      addAnnouncementCategory,
      switchView,
      markRead,
      delete: deleteAnnouncementById
    };
  };

  const member = () => {
    let currentCategory = '';
    const defaultCategories = [
        '22222222-2222-2222-2222-222222222222',
        '4fd20ed0-a2ed-4536-8b8c-d04757c23bb0',
        'df742897-b7a6-492f-b8c3-5e23f735451d'
    ];

    const init = () => {
        loadCategories();
        loadAnnouncements();

        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                console.log('Selected category:', e.target.value);
                currentCategory = e.target.value;
                loadAnnouncements();
            });
        }
    };

    const loadCategories = async () => {
        const categories = await fetchCategories();
        console.log('Fetched categories:', categories);
        const categoryFilter = document.getElementById('categoryFilter');
        const announcementCategory = document.getElementById('announcementCategory');

        if (categoryFilter && announcementCategory) {
            categoryFilter.innerHTML = '<option value="">All Categories</option>';
            announcementCategory.innerHTML = '<option value="">Select Category</option>';

            categories.forEach((cat) => {
                categoryFilter.insertAdjacentHTML('beforeend', `<option value="${cat.id}">${cat.name}</option>`);
                announcementCategory.insertAdjacentHTML('beforeend', `<option value="${cat.id}">${cat.name}</option>`);
            });
        }
    };

    const loadAnnouncements = async () => {
        console.log('Fetching announcements for:', currentCategory ? [currentCategory] : defaultCategories);
        const data = await userfetchAnnouncements(currentCategory ? [currentCategory] : defaultCategories);
        console.log('Announcements data:', data);
        renderTable(data);
        renderCard(data);
        const unreadCount = data.filter((a) => !a.is_read).length;
        BadgeManager.updateBadge('announcementBadge', unreadCount);
    };

    const renderTable = (data) => {
        const tbody = document.getElementById('announcementTable');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!data.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="height: 200px; padding: 1rem;">
                        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: #888;">
                            <i class="fa fa-box-open" style="font-size: 70px;"></i>
                            <span style="margin-top: 0.5rem;">No announcement found.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        data.forEach((a) => {
            tbody.insertAdjacentHTML('beforeend', `
                <tr>
                    <td>${a.announcement_title}</td>
                    <td>${a.message}</td>
                    <td>${new Date(a.created_at).toLocaleString()}</td>
                    <td>${a.announcement_categories?.name || 'Uncategorized'}</td>
                    <td>
                        <button style="font-weight:bold; padding: 5px; border: none; background-color:${getStatusColor(a.is_read ? 'Read' : 'Unread')}; color: white; border-radius: 3px;">
                            ${a.is_read ? 'Read' : 'Unread'}
                        </button>
                    </td>
                </tr>
            `);
        });

        tbody.querySelectorAll('.announcement-read-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                console.log(`Announcement read button clicked for ID: ${btn.dataset.id}`);
                markRead(btn.dataset.id);
            });
        });
    };

    const renderCard = (data, allowActions = true) => {
        const container = document.getElementById('announcementCardView');
        if (!container) return;
        container.innerHTML = '';

        if (!data.length) {
            container.innerHTML = '<p>No announcements found.</p>';
            return;
        }

        data.forEach((a) => {
            container.insertAdjacentHTML('beforeend', `
                <div class="announcement-card">
                    <h4>Title: ${a.announcement_title}</h4>
                    <p><strong>Message: </strong>${a.message}</p>
                    <p><strong>Date created: </strong>${new Date(a.created_at).toLocaleString()}</p>
                    <p><strong>Category: </strong>${a.announcement_categories?.name || 'Uncategorized'}</p>
                    <p><strong>Status: </strong>
                        <button style="font-weight:bold; padding: 5px; border: none; background-color:${getStatusColor(a.is_read ? 'Read' : 'Unread')}; color: white; border-radius: 3px;">
                            ${a.is_read ? 'Read' : 'Unread'}
                        </button>
                    </p>
                </div>
            `);
        });

        if (allowActions) {
            container.querySelectorAll('.announcement-read-btn').forEach((btn) => {
                btn.addEventListener('click', () => {
                    console.log(`Announcement read button clicked for ID: ${btn.dataset.id}`);
                    markRead(btn.dataset.id);
                });
            });
        }
    };

    const markRead = async (id) => {
        try {
            await markAsRead(id);
            await loadAnnouncements();
            SoundManager.playConfirmation();
        } catch (err) {
            console.error('Failed to mark announcement as read:', err);
        }
    };

    const switchView = (view) => {
        const listView = document.getElementById('announcementListView');
        const cardView = document.getElementById('announcementCardView');
        if (listView && cardView) {
            listView.style.display = view === 'list' ? 'table' : 'none';
            cardView.style.display = view === 'card' ? 'grid' : 'none';
        }
    };

    return { init, switchView, markRead };
};

  return { staff, member };
})();

export default announcement;
window.announcement = announcement;

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
      announcement.staff().init();
      break;
    case 'vice_president':
      announcement.staff().init();
      break;
    case 'secretary':
      announcement.staff().init();
      break;
    case 'auditor':
      announcement.staff().init();
      break;
    case 'treasurer':
      announcement.staff().init();
      break;
    case 'member':
      announcement.member().init();
      break;
    default:
      logoutUser();
  }
});