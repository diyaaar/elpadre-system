/**
 * pdfToImage.ts
 *
 * Converts the first page of a PDF file to a high-quality PNG base64 string.
 * Uses pdf.js loaded lazily from CDN — no npm dependency, zero bundle impact.
 *
 * RENDER_SCALE=2.5 gives ~2.5x resolution. A typical A4 PDF at 72dpi becomes
 * ~1487×2100px which is well within GPT-4o's vision window and preserves
 * all text detail without exceeding the OpenAI image size limit.
 */

const PDFJS_VERSION = '3.11.174'
const PDFJS_CDN = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}`
const RENDER_SCALE = 2.5   // 2.5× = high quality, readable text, ~1-2MB PNG

// Module-level cache so we only inject the script tag once
let _pdfjsLib: any = null
let _loading: Promise<any> | null = null

async function loadPdfJs(): Promise<any> {
    if (_pdfjsLib) return _pdfjsLib
    if (_loading) return _loading

    _loading = new Promise<any>((resolve, reject) => {
        // Check if already loaded (e.g. hot-reload)
        if ((window as any).pdfjsLib) {
            _pdfjsLib = (window as any).pdfjsLib
            _pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`
            resolve(_pdfjsLib)
            return
        }

        const script = document.createElement('script')
        script.src = `${PDFJS_CDN}/pdf.min.js`
        script.async = true
        script.onload = () => {
            const lib = (window as any).pdfjsLib
            if (!lib) {
                reject(new Error('pdf.js CDN yüklenemedi'))
                return
            }
            lib.GlobalWorkerOptions.workerSrc = `${PDFJS_CDN}/pdf.worker.min.js`
            _pdfjsLib = lib
            resolve(lib)
        }
        script.onerror = () => reject(new Error('pdf.js CDN yüklenemedi. İnternet bağlantınızı kontrol edin.'))
        document.head.appendChild(script)
    })

    return _loading
}

/**
 * Renders the first page of a PDF File as a high-quality PNG.
 * @returns Base64 string (without the data:image/png;base64, prefix)
 */
export async function pdfFirstPageToPngBase64(file: File): Promise<string> {
    const pdfjs = await loadPdfJs()

    const arrayBuffer = await file.arrayBuffer()
    const typedArray = new Uint8Array(arrayBuffer)

    const pdf = await pdfjs.getDocument({ data: typedArray }).promise
    const page = await pdf.getPage(1)

    const viewport = page.getViewport({ scale: RENDER_SCALE })

    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context alınamadı')

    await page.render({ canvasContext: ctx, viewport }).promise

    // PNG at full quality — no compression loss
    const dataUrl = canvas.toDataURL('image/png', 1.0)

    // Return only the base64 part (strip the data URI prefix)
    return dataUrl.split(',')[1]
}
