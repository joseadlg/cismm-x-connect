export const DEVICE_ID_STORAGE_KEY = 'cismm_device_id';

export const getOrCreateDeviceId = (): string => {
    let deviceId = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY);

    if (!deviceId) {
        deviceId = crypto.randomUUID();
        window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    }

    return deviceId;
};
