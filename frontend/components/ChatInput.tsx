// 'use client';

// import { useState } from 'react';

// export function ChatInput({
//   onSend,
//   disabled,
// }: {
//   onSend: (text: string) => void;
//   disabled?: boolean;
// }) {
//   const [text, setText] = useState('');

//   function handleSend() {
//     onSend(text);
//     setText('');
//   }

//   return (
//     <div className="mt-4 flex items-end gap-3">
//       <textarea
//         value={text}
//         onChange={(e) => setText(e.target.value)}
//         placeholder="Message Playground…"
//         className="flex-1 input min-h-[48px] max-h-[160px]"
//         onKeyDown={(e) => {
//           if (e.key === 'Enter' && !e.shiftKey) {
//             e.preventDefault();
//             handleSend();
//           }
//         }}
//       />

//       <button
//         onClick={handleSend}
//         disabled={disabled}
//         className="text-sm
//                 px-4 py-2
//                 rounded-lg
//                 bg-white
//                 text-black
//                 font-medium
//                 hover:bg-slate-200
//                 transition
//                 shadow-sm
//                 "
//       >
//         Send
//       </button>
//     </div>
//   );
// }
