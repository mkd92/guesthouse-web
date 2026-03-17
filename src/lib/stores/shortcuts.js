import { writable } from 'svelte/store';

// Set to 'new-room' or 'new-property' to trigger modal from anywhere
export const pendingAction = writable(null);
