// Pure data + lookup (no React) so it can be unit-tested.
export const DICTIONARY = {
  en: {
    "nav.home": "Home", "nav.discover": "Discover", "nav.network": "My Network", "nav.workshops": "Workshops",
    "nav.jobs": "Jobs", "nav.mentorship": "Mentorship", "nav.officeHours": "Office Hours", "nav.projects": "Projects",
    "nav.events": "Events", "nav.tools": "Tools", "nav.messages": "Messages", "nav.notifications": "Notifications",
    "nav.dashboard": "Dashboard", "nav.users": "Users", "nav.posts": "Posts", "nav.reports": "Reports", "nav.activity": "Activity Logs",
    "nav.profile": "Profile", "nav.createWorkshop": "+ Create Workshop", "nav.logout": "Log out", "nav.search": "Search",
    "common.loading": "Loading…", "common.loadMore": "Load more", "common.save": "Save", "common.cancel": "Cancel",
    "search.placeholder": "Search people, jobs, events…", "search.title": "Search",
    "feed.title": "Community feed", "feed.share": "Share something", "feed.post": "Post", "feed.saved": "Saved",
    "feed.all": "All", "feed.trending": "Trending tags",
    "theme.dark": "Dark mode", "theme.light": "Light mode", "lang.switch": "বাংলা",
  },
  bn: {
    "nav.home": "হোম", "nav.discover": "খুঁজুন", "nav.network": "আমার নেটওয়ার্ক", "nav.workshops": "ওয়ার্কশপ",
    "nav.jobs": "চাকরি", "nav.mentorship": "মেন্টরশিপ", "nav.officeHours": "অফিস আওয়ার", "nav.projects": "প্রজেক্ট",
    "nav.events": "ইভেন্ট", "nav.tools": "টুলস", "nav.messages": "মেসেজ", "nav.notifications": "নোটিফিকেশন",
    "nav.dashboard": "ড্যাশবোর্ড", "nav.users": "ব্যবহারকারী", "nav.posts": "পোস্ট", "nav.reports": "রিপোর্ট", "nav.activity": "অ্যাক্টিভিটি লগ",
    "nav.profile": "প্রোফাইল", "nav.createWorkshop": "+ ওয়ার্কশপ তৈরি করুন", "nav.logout": "লগ আউট", "nav.search": "সার্চ",
    "common.loading": "লোড হচ্ছে…", "common.loadMore": "আরও দেখুন", "common.save": "সংরক্ষণ", "common.cancel": "বাতিল",
    "search.placeholder": "মানুষ, চাকরি, ইভেন্ট খুঁজুন…", "search.title": "সার্চ",
    "feed.title": "কমিউনিটি ফিড", "feed.share": "কিছু শেয়ার করুন", "feed.post": "পোস্ট", "feed.saved": "সংরক্ষিত",
    "feed.all": "সব", "feed.trending": "ট্রেন্ডিং ট্যাগ",
    "theme.dark": "ডার্ক মোড", "theme.light": "লাইট মোড", "lang.switch": "English",
  },
};

export function translate(lang, key) {
  return DICTIONARY[lang]?.[key] ?? DICTIONARY.en[key] ?? key;
}
