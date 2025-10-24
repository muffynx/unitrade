interface Message {
  id: string;
  title: string;
  desc: string;
  category: string;
  time: string;
  user?: { name: string };
  likes?: number;
  comments?: number;
}
export const messagesData: Message[] = [
  { 
    id: "1", 
    title: "Interested in your textbook", 
    desc: "Is this still available?", 
    category: "Textbooks", 
    time: "2h ago"
  },
  { 
    id: "2", 
    title: "Price negotiation", 
    desc: "Would you take 30,000 for the MacBook?", 
    category: "Electronics",
    time: "1h ago" 
  },
  { 
    id: "3", 
    title: "Meeting request", 
    desc: "Can we meet tomorrow at the library?", 
    category: "General",
    time: "30min ago"
  },
  { 
    id: "4", 
    title: "Looking for furniture", 
    desc: "Need a study desk for my dorm room", 
    category: "Furniture",
    time: "3h ago"
  },
  { 
    id: "5", 
    title: "Sports equipment wanted", 
    desc: "Looking for basketball shoes size 42", 
    category: "Sports",
    time: "5h ago"
  },
];