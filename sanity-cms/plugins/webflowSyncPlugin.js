import { definePlugin } from 'sanity'
import SyncToWebflowAction from '../components/SyncToWebflowAction'

export const webflowSyncPlugin = definePlugin({
  name: 'webflow-sync',
  tools: [
    {
      name: 'webflow-sync',
      title: 'Webflow Sync',
      icon: () => '🔄',
      component: SyncToWebflowAction,
    }
  ]
})

