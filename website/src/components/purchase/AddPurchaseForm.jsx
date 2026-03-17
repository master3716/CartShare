import React, { useState } from 'react'
import { Plus, ChevronDown, Link as LinkIcon } from 'lucide-react'
import { api } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'
import Spinner from '../ui/Spinner'

function detectPlatform(url) {
  if (!url) return 'Other'
  const lower = url.toLowerCase()
  if (lower.includes('amazon.')) return 'Amazon'
  if (lower.includes('aliexpress.')) return 'AliExpress'
  if (lower.includes('temu.')) return 'Temu'
  if (lower.includes('shein.')) return 'Shein'
  if (lower.includes('etsy.')) return 'Etsy'
  return 'Other'
}

const CATEGORY_KEYWORDS = [
  { value: 'electronics', words: ['laptop','computer','pc','phone','iphone','samsung','android','tablet','ipad','headphone','earphone','earbud','airpod','speaker','camera','monitor','keyboard','mouse','cable','charger','battery','tv','television','gaming','console','playstation','xbox','nintendo','gpu','cpu','processor','ram','ssd','hard drive','router','printer','smartwatch','watch','drone','microphone','webcam','usb','hdmi','graphics card','motherboard','power supply','led','rgb','projector','coffee machine','espresso machine','air fryer','instant pot','rice cooker','blender','appliance','mixer'] },
  { value: 'fashion', words: ['shirt','pants','dress','shoes','sneakers','boots','jacket','coat','hoodie','sweater','jeans','skirt','blouse','suit','tie','hat','cap','scarf','gloves','handbag','purse','wallet','belt','jewelry','necklace','earring','ring','bracelet','sunglasses','glasses','clothing','apparel','fashion','shorts','leggings','swimsuit','bikini','underwear','socks','sandals','heels','loafers','lace','fabric','linen','cotton'] },
  { value: 'home_kitchen', words: ['kitchen','cookware','pan','pot','knife','toaster','coffee maker','coffee machine','espresso','microwave','refrigerator','furniture','chair','table','sofa','couch','bed','pillow','blanket','curtain','lamp','storage','organizer','cleaning','vacuum','mop','candle','vase','rug','carpet','shelf','cabinet','drawer','mattress','frame','mirror','clock','towel','sheet','duvet','air fryer','instant pot','rice cooker','kettle','juicer','food processor','toaster oven','dishwasher'] },
  { value: 'baby_kids', words: ['baby','infant','toddler','diaper','stroller','crib','pacifier','bottle','formula','kids','children','child','newborn','maternity','nursery','baby monitor','car seat','high chair','playpen','teether','sippy'] },
  { value: 'beauty_health', words: ['makeup','lipstick','foundation','mascara','skincare','moisturizer','serum','shampoo','conditioner','perfume','cologne','vitamin','supplement','fitness','yoga mat','medicine','cream','lotion','sunscreen','face wash','toner','blush','eyeshadow','concealer','primer','nail','hair','brush','razor','deodorant','toothbrush','dental','health'] },
  { value: 'sports', words: ['gym','workout','exercise','weights','dumbbell','barbell','yoga','bicycle','bike','tent','camping','hiking','running','football','basketball','soccer','tennis','golf','swimming','sports','athletic','training','resistance band','jump rope','treadmill','skiing','snowboard','fishing','hunting','cycling','racket','glove','helmet','knee pad'] },
  { value: 'books_media', words: ['book','novel','textbook','kindle','magazine','music','movie','dvd','vinyl','record','audiobook','manga','comic','journal','planner','notebook','pen','pencil','art supply','painting','drawing','craft','stationery'] },
  { value: 'toys_games', words: ['toy','lego','puzzle','board game','action figure','doll','stuffed animal','playset','video game','card game','remote control','rc car','building block','play','game','figurine','collectible','model','train set'] },
  { value: 'food', words: ['food','snack','coffee','tea','chocolate','candy','protein bar','cereal','spice','sauce','oil','nuts','dried fruit','cookie','biscuit','chips','popcorn','drink','juice','energy drink','protein powder','meal prep','instant','seasoning'] },
  { value: 'pets', words: ['dog','cat','pet','collar','leash','cage','aquarium','fish','bird','hamster','rabbit','litter','pet food','treat','chew','crate','carrier','grooming','flea','pet bed','scratching post','catnip','bone'] },
]

export function detectCategories(name, platform) {
  if (!name) return []
  const lower = name.toLowerCase()
  const results = []
  if (platform === 'Shein' && !results.includes('fashion')) results.push('fashion')
  for (const cat of CATEGORY_KEYWORDS) {
    if (!results.includes(cat.value) && cat.words.some(w => lower.includes(w))) {
      results.push(cat.value)
    }
  }
  return results
}

const platforms = ['Amazon', 'AliExpress', 'Temu', 'Shein', 'Etsy', 'Other']

export const CATEGORIES = [
  { value: 'electronics',   label: '🖥️ Electronics' },
  { value: 'fashion',       label: '👗 Fashion' },
  { value: 'home_kitchen',  label: '🏠 Home & Kitchen' },
  { value: 'baby_kids',     label: '🍼 Baby & Kids' },
  { value: 'beauty_health', label: '💄 Beauty & Health' },
  { value: 'sports',        label: '⚽ Sports & Outdoors' },
  { value: 'books_media',   label: '📚 Books & Media' },
  { value: 'toys_games',    label: '🎮 Toys & Games' },
  { value: 'food',          label: '🍕 Food & Grocery' },
  { value: 'pets',          label: '🐾 Pets' },
  { value: 'other',         label: '📦 Other' },
]

export default function AddPurchaseForm({ onAdded }) {
  const { showToast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    url: '',
    name: '',
    price: '',
    platform: 'Other',
    categories: [],
    isPublic: true,
  })

  const [categoryAutoDetected, setCategoryAutoDetected] = useState(false)

  const handleUrlChange = (e) => {
    const url = e.target.value
    const detected = detectPlatform(url)
    setForm(prev => {
      const newForm = { ...prev, url, platform: detected }
      const cats = detectCategories(prev.name, detected)
      if (cats.length) { setCategoryAutoDetected(true); newForm.categories = cats }
      return newForm
    })
  }

  const handleNameChange = (e) => {
    const name = e.target.value
    const cats = detectCategories(name, form.platform)
    setCategoryAutoDetected(cats.length > 0)
    setForm(prev => ({ ...prev, name, categories: cats.length ? cats : prev.categories }))
  }

  const toggleCategory = (value) => {
    setCategoryAutoDetected(false)
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(value)
        ? prev.categories.filter(c => c !== value)
        : [...prev.categories, value],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.url.trim() || !form.name.trim()) {
      showToast('URL and name are required', 'error')
      return
    }
    setLoading(true)
    const result = await api.addPurchase({
      product_url: form.url.trim(),
      item_name: form.name.trim(),
      price: form.price.trim() || null,
      platform: form.platform.toLowerCase(),
      is_public: form.isPublic,
      categories: form.categories,
    })
    setLoading(false)

    if (result.ok) {
      showToast('Item added!', 'success')
      setCategoryAutoDetected(false)
      setForm({ url: '', name: '', price: '', platform: 'Other', categories: [], isPublic: true })
      setExpanded(false)
      onAdded?.(result.data)
    } else {
      showToast(result.data?.error || 'Failed to add item', 'error')
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden mb-6">
      <button
        className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <Plus className="w-5 h-5 text-brand-400" />
          </div>
          <span className="font-semibold text-white">Add New Item</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Animated expand/collapse */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="pt-0">
          <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 border-t border-gray-800 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Product URL *</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="url"
                  value={form.url}
                  onChange={handleUrlChange}
                  placeholder="https://amazon.com/..."
                  required
                  className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Item Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={handleNameChange}
                placeholder="What did you buy?"
                required
                maxLength={200}
                className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Price</label>
                <input
                  type="text"
                  value={form.price}
                  onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="$29.99"
                  className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 outline-none transition-all w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">Platform</label>
                <select
                  value={form.platform}
                  onChange={e => setForm(prev => ({ ...prev, platform: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-2.5 text-white outline-none transition-all w-full"
                >
                  {platforms.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-gray-400">Categories</label>
                {categoryAutoDetected && form.categories.length > 0 && (
                  <span className="text-[10px] text-brand-400 font-medium">✨ Auto-detected</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => toggleCategory(c.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      form.categories.includes(c.value)
                        ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                        : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isPublic}
                onClick={() => setForm(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${form.isPublic ? 'bg-brand-500' : 'bg-gray-700'}`}
                style={{ height: '22px', width: '40px' }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isPublic ? 'translate-x-4.5' : 'translate-x-0'}`}
                  style={{ transform: form.isPublic ? 'translateX(18px)' : 'translateX(0)' }}
                />
              </button>
              <span className="text-sm text-gray-300">
                {form.isPublic ? 'Public — visible to friends' : 'Private — only you can see this'}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-500/25 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Spinner size="sm" /> : <Plus className="w-4 h-4" />}
              {loading ? 'Adding...' : 'Add Item'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
