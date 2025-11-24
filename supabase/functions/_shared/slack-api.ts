/**
 * Slack API client utilities for resolving user and channel names.
 *
 * Includes in-memory caching (1 hour TTL) to avoid hitting Slack rate limits (200 req/min).
 */

interface CacheEntry {
  value: string
  expires: number
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry>()

const CACHE_TTL_MS = 3600000 // 1 hour

/**
 * Resolve a Slack user ID to human-readable name using Slack Web API.
 *
 * @param userId - Slack user ID (e.g., "U09UW863FEG")
 * @param botToken - Slack bot token (xoxb-...)
 * @returns Human-readable name (real_name or username) or userId on error
 */
export async function resolveUserName(userId: string, botToken: string): Promise<string> {
  if (!userId || !botToken) return userId

  // Check cache first
  const cacheKey = `user:${userId}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.value
  }

  try {
    const response = await fetch(`https://slack.com/api/users.info?user=${userId}`, {
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    })

    const data = await response.json()

    if (!data.ok) {
      console.error(`Slack users.info API error: ${data.error}`)
      return userId
    }

    // Prefer real_name (full name) over name (username)
    const name = data.user?.real_name || data.user?.name || userId

    // Cache the result
    cache.set(cacheKey, {
      value: name,
      expires: Date.now() + CACHE_TTL_MS
    })

    return name
  } catch (error) {
    console.error('Error resolving user name:', error)
    return userId
  }
}

/**
 * Resolve a Slack channel ID to human-readable name using Slack Web API.
 *
 * @param channelId - Slack channel ID (e.g., "C09UB7TF3U7")
 * @param botToken - Slack bot token (xoxb-...)
 * @returns Human-readable channel name (without #) or channelId on error
 */
export async function resolveChannelName(channelId: string, botToken: string): Promise<string> {
  if (!channelId || !botToken) return channelId

  // Check cache first
  const cacheKey = `channel:${channelId}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) {
    return cached.value
  }

  try {
    const response = await fetch(`https://slack.com/api/conversations.info?channel=${channelId}`, {
      headers: {
        'Authorization': `Bearer ${botToken}`,
        'Content-Type': 'application/json; charset=utf-8'
      }
    })

    const data = await response.json()

    if (!data.ok) {
      console.error(`Slack conversations.info API error: ${data.error}`)
      return channelId
    }

    const name = data.channel?.name || channelId

    // Cache the result
    cache.set(cacheKey, {
      value: name,
      expires: Date.now() + CACHE_TTL_MS
    })

    return name
  } catch (error) {
    console.error('Error resolving channel name:', error)
    return channelId
  }
}

/**
 * Resolve both user and channel names in parallel.
 *
 * @param userId - Slack user ID
 * @param channelId - Slack channel ID
 * @param botToken - Slack bot token
 * @returns Tuple of [userName, channelName]
 */
export async function resolveNames(
  userId: string,
  channelId: string,
  botToken: string
): Promise<[string, string]> {
  return await Promise.all([
    resolveUserName(userId, botToken),
    resolveChannelName(channelId, botToken)
  ])
}
