import { 
  fetchNotifications, 
  fetchTypes, 
  createNotification, 
  markAsRead, 
  deleteNotification, 
  createType,
  userfetchNotifications,
  identifyUser
} from '../api/api-notification.js';
import { BadgeManager } from '../utils/badgeManager.js';
import { SoundManager } from '../utils/soundManager.js';
import { getStatusColor, notifTypes } from '../utils/colorStatus.js';
import { logoutUser } from '../api/auth-guard.js';

const notification = (() => {
    const userProfile = JSON.parse(localStorage.getItem('user'));
    const user_id = userProfile?.id;

    const staff = () => {
    let currentType = '';

    const init = () => {
      loadNotifTypes();
      loadNotifications();

      const typeFilter = document.getElementById('typeFilter');
      if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
          currentType = e.target.value;
          loadNotifications();
        });
      }

      const notificationForm = document.getElementById('notificationForm');
      if (notificationForm) {
        notificationForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await handleSubmit();
        });
      }

      const typeForm = document.getElementById('typeForm');
      if (typeForm) {
        typeForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          await handleTypeSubmit();
        });
      }

      const closeNotificationBtn = document.querySelector('#createNotificationModal .close-btn');
      if (closeNotificationBtn) {
        closeNotificationBtn.addEventListener('click', (e) => {
          e.preventDefault();
          closeForm();
        });
      }

      const closeTypeBtn = document.querySelector('#createTypeSection .close-btn');
      if (closeTypeBtn) {
        closeTypeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          closeType();
        });
      }
    };

    const notificationSection = async () => {
      let data = await fetchNotifications(currentType);
      data = await enrichNotificationsWithRoles(data);
      renderTable(data, false);
      renderCard(data, false);
      const unreadCount = data.filter((a) => !a.is_read).length;
      BadgeManager.updateBadge('notificationBadge', unreadCount);
    };

    const loadNotifTypes = async () => {
      try {
        const types = await fetchTypes();
        const typeFilter = document.getElementById('typeFilter');
        const notificationType = document.getElementById('notificationType');

        if (typeFilter && notificationType) {
          typeFilter.innerHTML = '<option value="">All Notification Types</option>';
          notificationType.innerHTML = '<option value="">Select Type</option>';

          types.forEach((typ) => {
            const option1 = document.createElement('option');
            option1.value = typ.id;
            option1.textContent = typ.name;
            typeFilter.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = typ.id;
            option2.textContent = typ.name;
            notificationType.appendChild(option2);
          });
        } else {
          console.error('typeFilter or notificationType element not found');
        }
      } catch (err) {
        console.error('Failed to load notification types:', err);
      }
    };

    const loadNotifications = async () => {
      try {
        let data = await fetchNotifications(currentType);
        data = await enrichNotificationsWithRoles(data);
        renderTable(data, true);
        renderCard(data, true);
        const unreadCount = data.filter((a) => !a.is_read).length;
        BadgeManager.updateBadge('notificationBadge', unreadCount);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };

    const enrichNotificationsWithRoles = async (notifications) => {
      const enriched = await Promise.all(
        notifications.map(async (n) => {
          const role = await identifyUser(n.user_id);
          return { ...n, user_role: role };
        })
      );
      return enriched;
    };

    const renderTable = (data, allowActions = true) => {
      const tbody = document.getElementById('notificationTable');
      if (!tbody) return;
      tbody.innerHTML = '';

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="${allowActions ? 6 : 5}" style="height: 200px; padding: 1rem;">
              <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: #888;">
                <i class="fa fa-box-open" style="font-size: 70px;"></i>
                <span style="margin-top: 0.5rem;">No notifications found.</span>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      data.forEach((a) => {
        const row = document.createElement('tr');

        // Define button contents with conditional logic
        const readButtonContent = a.user_role !== 'member' && allowActions
          ? `<button style="margin-right:1rem;" class="mark-read-btn notification-read-btn" data-id="${a.id}"><i class="fas fa-eye"></i> Read</button>`
          : '';
        const deleteButtonContent = allowActions
          ? `<button class="mark-delete-btn notification-delete-btn" data-id="${a.id}"><i class="fas fa-trash-alt"></i> Delete</button>`
          : '';

        row.innerHTML = `
          <td>${a.notification_title}</td>
          <td>${a.message}</td>
          <td>${new Date(a.created_at).toLocaleString()}</td>
          <td>
            <button style="padding: 5px; border: none;  background-color: ${notifTypes[a.notification_types?.name] || '#ccc'}; color:white;">
            <strong>
              ${a.notification_types?.name || 'Unknown'}
              </strong>
            </button>
          </td>
          <td>
            <button style="font-weight:bold; padding: 5px; border: none; background-color:${getStatusColor(a.is_read ? 'Read' : 'Unread')}; color: white;">
              ${a.is_read ? 'Read' : 'Unread'}
            </button>
          </td>
          <td>${readButtonContent}<!-- Separate td for Read button -->${deleteButtonContent}</td> <!-- Separate td for Delete button -->
        `;

        tbody.appendChild(row);
      });

      if (allowActions) {
        tbody.querySelectorAll('.notification-read-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            markRead(btn.dataset.id);
          });
        });
        tbody.querySelectorAll('.notification-delete-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            deleteNotificationById(btn.dataset.id);
          });
        });
      }
    };

    const renderCard = (data, allowActions = true) => {
      const container = document.getElementById('notificationCardView');
      if (!container) return;
      container.innerHTML = '';
      if (!data.length) {
        container.innerHTML = '<p>No notifications found.</p>';
        return;
      }
      data.forEach((a) => {
        const card = document.createElement('div');
        card.className = 'notification-card';

        const readButtonContent = a.user_role !== 'member' && allowActions
          ? `<button class="mark-read-btn notification-read-btn" style="background-color: #228116; margin-top:1.5rem;" data-id="${a.id}"><i class="fas fa-eye"></i> Read</button>`
          : '';
        const deleteButtonContent = allowActions
          ? `<button class="mark-delete-btn notification-delete-btn" style="background-color: #f44336;
    margin-top:1.5rem;" data-id="${a.id}"><i class="fas fa-trash-alt"></i> Delete</button>`
          : '';
        const actionContent = `
          <div class="card-actions">
            <div class="action-buttons">
              ${readButtonContent}
              ${deleteButtonContent}
            </div>
          </div>
        `;

        card.innerHTML = `
          <h4>Title: ${a.notification_title}</h4>
          <p><strong>Message: </strong>${a.message}</p>
          <p><strong>Date created: </strong>${new Date(a.created_at).toLocaleString()}</p>
          <p><strong>Category: </strong>
            <button style="border-radius: 0px; padding: 5px; border: none;  background-color: ${notifTypes[a.notification_types?.name] || '#ccc'}; color:white;"><strong>
              ${a.notification_types?.name || 'Unknown'}
            </strong></button>
          </p>
          <p><strong>Status: </strong>
            <button style="border-radius: 0px; font-weight:bold; padding: 5px; border: none; background-color:${getStatusColor(a.is_read ? 'Read' : 'Unread')}; color: white;">
              ${a.is_read ? 'Read' : 'Unread'}
            </button>
          </p>
          ${allowActions ? actionContent : ''}
        `;
        container.appendChild(card);
      });

      if (allowActions) {
        container.querySelectorAll('.notification-read-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            markRead(btn.dataset.id);
          });
        });
        container.querySelectorAll('.notification-delete-btn').forEach((btn) => {
          btn.addEventListener('click', () => {
            deleteNotificationById(btn.dataset.id);
          });
        });
      }
    };

    const handleSubmit = async () => {
      const title = document.getElementById('notificationTitle')?.value.trim();
      const message = document.getElementById('notificationMessage')?.value.trim();
      const type_id = document.getElementById('notificationType')?.value;

      try {
        await createNotification(title, message, type_id, user_id);
        document.getElementById('notificationForm')?.reset();
        closeForm();
        await loadNotifications();
        SoundManager.playNotification();
      } catch (err) {
        console.error('Failed to create notification:', err);
        SoundManager.playError();
      }
    };

    const handleTypeSubmit = async () => {
      const name = document.getElementById('newType')?.value.trim();
      if (!name) {
        return;
      }

      try {
        await createType(name);
        document.getElementById('typeForm')?.reset();
        loadNotifTypes();
        closeForm();
        SoundManager.playNotification();
      } catch (err) {
        console.error('Failed to create type:', err);
        SoundManager.playError();
      }
    };

    const markRead = async (id) => {
      try {
        await markAsRead(id);
        loadNotifications();
        SoundManager.playConfirmation();
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    };

    const deleteNotificationById = async (id) => {
      try {
        await deleteNotification(id);
        loadNotifications();
        SoundManager.playDelete();
      } catch (err) {
        console.error('Failed to delete notification:', err);
      }
    };

    const switchView = (view) => {
      const listView = document.getElementById('notificationListView');
      const cardView = document.getElementById('notificationCardView');
      if (listView && cardView) {
        listView.style.display = view === 'list' ? 'table' : 'none';
        cardView.style.display = view === 'card' ? 'grid' : 'none';
      }
    };

    const openForm = () => {
      const modal = document.getElementById('createNotificationModal');
      if (modal) modal.classList.add('active');
    };

    const closeForm = () => {
      const modal = document.getElementById('createNotificationModal');
      const typeSection = document.getElementById('createTypeSection');
      if (modal) modal.classList.remove('active');
      if (typeSection) typeSection.classList.remove('active');
    };

    const addNotificationType = () => {
      const section = document.getElementById('createTypeSection');
      if (section) section.classList.add('active');
    };

    const closeType = () => {
      const section = document.getElementById('createTypeSection');
      if (section) section.classList.remove('active');
    };

    return {
      init,
      notificationSection,
      switchView,
      openForm,
      closeForm,
      closeType,
      addNotificationType,
      markRead,
      delete: deleteNotificationById,
    };
  };

  const member = () => {
    let currentType = '';

    const init = () => {
      loadNotifTypes();
      loadNotifications();

      const typeFilter = document.getElementById('typeFilter');
      if (typeFilter) {
        typeFilter.addEventListener('change', (e) => {
          currentType = e.target.value;
          loadNotifications();
        });
      } else {
        console.error('typeFilter element not found');
      }
    };

    const loadNotifTypes = async () => {
      try {
        const types = await fetchTypes();
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
          typeFilter.innerHTML = '<option value="">All Notification Types</option>';
          types.forEach((typ) => {
            const option = document.createElement('option');
            option.value = typ.id;
            option.textContent = typ.name;
            typeFilter.appendChild(option);
          });
        } else {
          console.error('typeFilter element not found');
        }
      } catch (err) {
        console.error('Failed to load notification types:', err);
      }
    };

    const loadNotifications = async () => {
      try {
        const userProfile = JSON.parse(localStorage.getItem('user'));
        const userId = userProfile?.id;
        if (!userId) {
          console.error('No user ID found in localStorage');
          return;
        }

        const data = await userfetchNotifications(currentType, userId);
        renderTable(data);
        renderCard(data);
        const unreadCount = data.filter((a) => !a.is_read).length;
        BadgeManager.updateBadge('notificationBadge', unreadCount);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      }
    };

    const renderTable = (data) => {
      const tbody = document.getElementById('notificationTable');
      if (!tbody) return;

      tbody.innerHTML = '';

      if (!data.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="height: 200px; padding: 1rem;">
              <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; color: #888;">
                <i class="fa fa-box-open" style="font-size: 70px;"></i>
                <span style="margin-top: 0.5rem;">No notifications found.</span>
              </div>
            </td>
          </tr>
        `;
        return;
      }

      data.forEach((a) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${a.notification_title}</td>
          <td>${a.message}</td>
          <td>${new Date(a.created_at).toLocaleString()}</td>
          <td>${a.notification_types?.name || 'Unknown'}</td>
          <td>
            <button style="font-weight:bold; padding: 5px; border: none; background-color:${getStatusColor(a.is_read ? 'Read' : 'Unread')}; color: white;">
              ${a.is_read ? 'Read' : 'Unread'}
            </button>
          </td>
          <td>
            <button class="mark-read-btn" data-id="${a.id}"><i class="fas fa-eye"></i> Read</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      document.querySelectorAll('.mark-read-btn').forEach((btn) => {
        btn.addEventListener('click', () => markRead(btn.dataset.id));
      });
    };

    const renderCard = (data) => {
      const container = document.getElementById('notificationCardView');
      if (!container) return;

      container.innerHTML = '';

      if (!data.length) {
        container.innerHTML = '<p>No notifications found.</p>';
        return;
      }

      data.forEach((a) => {
        const card = document.createElement('div');
        card.className = 'notification-card';
        card.innerHTML = `
          <h4>Title: ${a.notification_title}</h4>
          <p><strong>Message: </strong>${a.message}</p>
          <p><strong>Date created: </strong>${new Date(a.created_at).toLocaleString()}</p>
          <p><strong>Category: </strong>${a.notification_types?.name || 'Unknown'}</p>
          <p><strong>Status: </strong>
            <button style="font-weight:bold; padding: 5px; border: none; background-color:${getStatusColor(a.is_read ? 'Read' : 'Unread')}; color: white;">
              ${a.is_read ? 'Read' : 'Unread'}
            </button>
          </p>
          <div class="card-actions">
            <button class="mark-read-btn" style="margin-top:1.5rem;" data-id="${a.id}"><i class="fas fa-eye"></i> Read</button>
          </div>
        `;
        container.appendChild(card);
      });

      document.querySelectorAll('.mark-read-btn').forEach((btn) => {
        btn.addEventListener('click', () => markRead(btn.dataset.id));
      });
    };

    const markRead = async (id) => {
      try {
        await markAsRead(id);
        loadNotifications();
        SoundManager.playConfirmation();
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    };

    const switchView = (view) => {
      const listView = document.getElementById('notificationListView');
      const cardView = document.getElementById('notificationCardView');
      if (listView && cardView) {
        listView.style.display = view === 'list' ? 'table' : 'none';
        cardView.style.display = view === 'card' ? 'grid' : 'none';
      }
    };

    return {
      init,
      switchView,
      markRead,
    };
  };

  return { staff, member };
})();

export default notification;
window.notification = notification;

document.addEventListener('DOMContentLoaded', () => {
  const userProfile = JSON.parse(localStorage.getItem('user'));

  if (!userProfile || !userProfile.role) {
    console.error('No valid user profile found');
    window.location.assign('/index.html');
    return;
  }

  const role = userProfile.role.toLowerCase();

  switch (role) {
    case 'president':
      notification.staff().init();
      break;
    case 'vice_president':
      notification.staff().init();
      break;
    case 'secretary':
      notification.staff().init();
      break;
    case 'auditor':
      notification.staff().init();
      break;
    case 'treasurer':
      notification.staff().init();
      break;
    case 'member':
      notification.member().init();
      break;

    default:
      logoutUser();
  }
});