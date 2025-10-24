// mockdata/listings.ts
import macbookpro from "../assets/macbookpro.jpeg";
import calculus from "../assets/calculus.jpg";
import deskcamp from "../assets/deskcamp.jpg";
import shoes from "../assets/shoes.jpeg";

export interface Listing {
  id: string; 
  img: string;
  title: string;
  desc: string;
  price: number;
  category: string; 
  time: string; 
  distance: string; 
  user: string; 
}

export const listingsData: Listing[] = [
  { 
    id: "1", 
    img: calculus, 
    title: "Calculus Textbook", 
    desc: "Like new condition", 
    price: 450,
    category: "Textbooks",
    time: "2h ago",
    distance: "0.5 km",
    user: "Alice"
  },
  { 
    id: "2",
    img: macbookpro, 
    title: "MacBook Pro 2020", 
    desc: "13 inch, 512GB", 
    price: 32000,
    category: "Electronic",
    time: "1h ago",
    distance: "1.2 km",
    user: "Bob"
  },
  { 
    id: "3", 
    img: deskcamp, 
    title: "Desk Lamp", 
    desc: "LED, adjustable", 
    price: 350,
    category: "Furniture",
    time: "3h ago",
    distance: "0.8 km",
    user: "Charlie"
  },
  { 
    id: "4",
    img: shoes, 
    title: "Basketball Shoes", 
    desc: "Size 42, worn twice", 
    price: 1200,
    category: "Sports",
    time: "5h ago",
    distance: "2.1 km",
    user: "David"
  },
  { 
    id: "5",
    img: shoes, 
    title: "Basketball Shoes", 
    desc: "Size 42, worn twice", 
    price: 1200,
    category: "Sports",
    time: "5h ago",
    distance: "2.1 km",
    user: "David"
  },
];