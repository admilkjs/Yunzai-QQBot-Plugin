export const config: {
  bot: {
    maxRetry: number
    sandbox?: boolean
    timeout?: number
    [key: string]: any
  }
  file?: {
    enable?: boolean
    preferUrlUpload?: boolean
    groupBase64Upload?: boolean
    privateForceChunk?: boolean
    allowForceChunk?: boolean
    autoExtractName?: boolean
    appendRecallIds?: boolean
    [key: string]: any
  }
  imageUploadProvider?: string
  groupIncreaseMsg?: boolean
  oneKeySendGroupMsg?: boolean
  web?: {
    password: {
      [key: string]: string
      default: string
    }
  }
  [key: string]: any
}

export const configSave: (config?: typeof config) => Promise<void>
export const refConfig: () => void

export const setMap: Record<string, string>

export function getImageUploadProviderLabel(): string
export function getUploadStatusText(): string
