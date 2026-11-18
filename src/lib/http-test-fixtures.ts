import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type InternalAxiosRequestConfig,
} from 'axios'

/** Creates a controllable axios response using the same rejection convention as XHR. */
export function reply(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown = null,
  headers: Record<string, string> = {}
): ReturnType<AxiosAdapter> {
  const response = {
    config,
    status,
    statusText: String(status),
    data,
    headers: new AxiosHeaders(headers),
  }
  return status < 400
    ? Promise.resolve(response)
    : Promise.reject(
        new AxiosError('测试响应', undefined, config, undefined, response)
      )
}

export function gate() {
  let release!: () => void
  const wait = new Promise<void>((resolve) => {
    release = resolve
  })
  return { wait, release }
}
