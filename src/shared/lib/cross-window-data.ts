const channelName = 'vivaz-data-changed';

/** Notify other same-origin windows to refetch; never transmit student data. */
export function broadcastDataChange() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(channelName);
  channel.postMessage('refetch');
  channel.close();
}

export function subscribeToDataChanges(refetch: () => void) {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = (event) => {
    if (event.data === 'refetch') refetch();
  };
  return () => channel.close();
}
