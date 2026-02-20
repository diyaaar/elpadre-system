// ============================================================
// FINANCE RECEIPTS STORAGE
// Follows existing lib/storage.ts pattern (public bucket)
// Bucket name: finance-receipts
// Path pattern: {userId}/{transactionId}/{filename}
// ============================================================

import { getSupabaseClient } from './supabase'

const BUCKET_NAME = 'finance-receipts'
const MAX_FILE_SIZE = 15 * 1024 * 1024 // 15 MB
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
]

export interface ReceiptUploadResult {
    path: string
    url: string
    error?: string
}

/**
 * Upload a receipt (image or PDF) to Supabase Storage.
 * @param file - The file to upload
 * @param userId - Auth user ID
 * @param refId - Transaction ID or temp placeholder ID
 */
export async function uploadReceipt(
    file: File,
    userId: string,
    refId: string
): Promise<ReceiptUploadResult> {
    if (file.size > MAX_FILE_SIZE) {
        return { path: '', url: '', error: `Dosya boyutu 15MB sınırını aşıyor (${(file.size / 1024 / 1024).toFixed(1)}MB)` }
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return { path: '', url: '', error: `Desteklenmeyen dosya türü. İzin verilen: JPG, PNG, GIF, WebP, PDF` }
    }

    try {
        const supabase = getSupabaseClient()
        const timestamp = Date.now()
        const ext = file.name.split('.').pop() || 'bin'
        const fileName = `receipt-${timestamp}.${ext}`
        const storagePath = `${userId}/${refId}/${fileName}`

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, file, { cacheControl: '3600', upsert: false })

        if (error) {
            console.error('[financeStorage] Upload error:', error)
            return { path: '', url: '', error: error.message || 'Yükleme başarısız' }
        }

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath)

        return { path: storagePath, url: urlData?.publicUrl || '' }
    } catch (err) {
        console.error('[financeStorage] Unexpected error:', err)
        return { path: '', url: '', error: err instanceof Error ? err.message : 'Yükleme başarısız' }
    }
}

/**
 * Delete a receipt from Supabase Storage by its storage path.
 */
export async function deleteReceipt(storagePath: string): Promise<void> {
    try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath])
        if (error) console.error('[financeStorage] Delete error:', error)
    } catch (err) {
        console.error('[financeStorage] Unexpected delete error:', err)
    }
}

/**
 * Get the public URL for a receipt given its storage path.
 */
export function getReceiptUrl(storagePath: string): string {
    const supabase = getSupabaseClient()
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath)
    return data.publicUrl
}
