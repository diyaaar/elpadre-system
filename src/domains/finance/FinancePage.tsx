import { Wallet } from 'lucide-react'
import { motion } from 'framer-motion'

export function FinancePage() {
    return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-12 text-center">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-8 shadow-2xl shadow-primary/20 border border-primary/20"
            >
                <Wallet className="w-12 h-12 text-primary" />
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
            >
                <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Finans Modülü</h2>
                <p className="text-text-tertiary max-w-md mx-auto text-lg leading-relaxed">
                    Gelir-gider takibi, bütçe yönetimi ve finansal analiz araçları çok yakında burada olacak.
                </p>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto opacity-50">
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-sm font-medium text-text-tertiary mb-1">Toplam Bakiye</div>
                        <div className="text-xl font-bold text-white">₺0,00</div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-sm font-medium text-text-tertiary mb-1">Aylık Gelir</div>
                        <div className="text-xl font-bold text-success">₺0,00</div>
                    </div>
                    <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
                        <div className="text-sm font-medium text-text-tertiary mb-1">Aylık Gider</div>
                        <div className="text-xl font-bold text-danger">₺0,00</div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
