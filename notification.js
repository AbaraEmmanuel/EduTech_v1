// Function to show notification
export function showNotification(message, type) {
    // Create a new div for the notification if it doesn't exist
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }

    // Set the message and type (success/error)
    notification.textContent = message;
    notification.className = `notification ${type}`;

    // Show the notification
    notification.classList.add('show');

    // Hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}
