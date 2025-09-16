export const SoundManager = (() => {
    const notificationSound = new Audio('/assets/audio/mixkit-software-interface-start-2574.wav');
    const confirmationSound = new Audio('/assets/audio/mixkit-confirmation-tone-2867.wav');
    const errorSound = new Audio('/assets/audio/error-8-206492.mp3');
    const receiptSound = new Audio('/assets/audio/mixkit-paper-slide-1530.wav');
    const deleteSound = new Audio('/assets/audio/Delete Button Sound Effect.mp3');
    const writeSound = new Audio('./assets/audio/mixkit-fast-writing-3196.wav')


    const playNotification = () => {
        notificationSound.currentTime = 0;
        notificationSound.play();
    };

    const playConfirmation = () => {
        confirmationSound.currentTime = 0;
        confirmationSound.play();
    };

    const playError = () => {
        errorSound.currentTime = 0;
        errorSound.play();
    };

    const playDelete = () => {
        deleteSound.currentTime = 0;
        deleteSound.play();
    };

    const playReceipt = () => {
        receiptSound.currentTime = 0;
        receiptSound.play();
    };

    const playNote = () => {
        writeSound.currentTime = 0;
        writeSound.play();
    }

    return {
        playNotification,
        playConfirmation,
        playDelete,
        playReceipt,
        playError,
        playNote
    };
})();
