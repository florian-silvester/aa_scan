import type {EncodableObject, Encoded, ID} from './encoder'

/**
 *
 * @public
 */
export type SynchronizationRequest = {
  /** The root ID of the descriptor being synchronized. */
  id: ID

  /** A set of descriptors. */
  descriptors?: Array<Encoded<string, EncodableObject>>
}

/**
 * The response from a server which supports descriptor synchronization.
 *
 * @public
 */
export type SynchronizationResponse =
  | SynchronizationResponseSuccess
  | SynchronizationResponseIncomplete

/**
 * SynchronizationResponseSuccess is returned from a synchronization server when
 * the requested descriptor has been successfully synchronized.
 *
 * @public
 */
export type SynchronizationResponseSuccess = {
  type: 'success'
}

/**
 * SynchronizationResponseIncomplete is returned from a synchronization server
 * when it needs more descriptors.
 *
 * @public
 */
export type SynchronizationResponseIncomplete = {
  type: 'incomplete'

  /**
   * A list of descriptor IDs which must be sent to the server (in a new
   * request). This is not guaranteeed to be the _full_ set of missing
   * descriptors.
   **/
  missingIds: string[]
}
