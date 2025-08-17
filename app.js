/* === DOM References === */
const seatingChartContainer = document.getElementById("seating-chart-container");
const absentList = document.getElementById("absent-list");
const onLeaveList = document.getElementById("on-leave-list");
const resetButton = document.getElementById("reset-button");
const copyAbsentButton = document.getElementById("copy-absent-button");
const copyLeaveButton = document.getElementById("copy-leave-button");
const tooltip = document.getElementById("seat-tooltip");
const currentDateAbsentEl = document.getElementById("current-date-absent");
const currentDateLeaveEl = document.getElementById("current-date-leave");

const adminPanelButton = document.getElementById("admin-panel-button");
const adminModal = document.getElementById("admin-modal");
const closeAdminModalButton = document.getElementById("close-admin-modal");
const adminTableBody = document.getElementById("admin-table-body");
const addRowButton = document.getElementById("add-row-button");
const downloadCsvButton = document.getElementById("download-csv-button");

/* === State === */
let allStudents = [];
let studentDataByClass = {};

/* === Initialization === */
document.addEventListener("DOMContentLoaded", () => {
  loadStudentData();
  const today = getBurmeseDate();
  currentDateAbsentEl.textContent = today;
  currentDateLeaveEl.textContent = today;
});

/* === Load Data from CSV === */
async function loadStudentData() {
  try {
    const resp = await fetch("students.csv?t=" + Date.now());
    if (!resp.ok) throw new Error("CSV Load Error");
    const csv = await resp.text();
    allStudents = parseCSV(csv);
    formatStudentData();
    createSeatingChart();
    updateLists();
  } catch (e) {
    console.error(e);
    seatingChartContainer.innerHTML =
      `<p class="text-red-500 text-center">CSV ဖိုင်ဖတ်ရာတွင် အမှားဖြစ်သည်</p>`;
  }
}

/* === CSV Parser === */
function parseCSV(text) {
  const [headerLine, ...lines] = text.trim().split("\n");
  const headers = headerLine.split(",").map(h=>h.trim());
  return lines.map(line=>{
    const values = line.split(",").map(v=>v.replace(/^"|"$/g,""));
    const row = {};
    headers.forEach((h,i)=>row[h]=values[i]||"");
    return row;
  });
}

function formatStudentData(){
  studentDataByClass = {};
  allStudents.forEach(st=>{
    if(st.Class && st.Seat && st.Name){
      if(!studentDataByClass[st.Class]) studentDataByClass[st.Class]={};
      studentDataByClass[st.Class][st.Seat] = {...st, isLeft: st.Left==="true"};
    }
  });
}

/* === Seating Chart === */
const dormColors = {
  "လှ":"bg-sky-100 text-sky-800 border-sky-200",
  "သိမ်":"bg-teal-100 text-teal-800 border-teal-200",
  "default":"bg-gray-200 text-gray-800 border-gray-300"
};

function createSeatingChart(){
  seatingChartContainer.innerHTML="";
  for(const classNum of Object.keys(studentDataByClass).sort((a,b)=>a-b)){
    const students=studentDataByClass[classNum];
    const maxSeat=Math.max(...Object.keys(students).map(Number));
    const box=document.createElement("div");
    box.innerHTML=`<div class="font-bold text-gray-700 mb-2">အတန်း - ${classNum}</div>`;
    const grid=document.createElement("div");
    grid.className="grid-container";

    for(let i=1;i<=maxSeat;i++){
      const st=students[i];
      const div=document.createElement("div");
      div.className="seat h-24 flex flex-col items-center justify-center rounded-md p-1 border transition-all text-center";
      div.dataset.classNum=classNum; div.dataset.seatNum=i;

      if(st){
        div.innerHTML=`<span class="font-bold text-sm">${i}</span>
                       <span class="text-[10px] mt-1">${st.Name}</span>
                       ${st.School?`<span class="text-[9px] text-gray-500">${st.School}</span>`:""}`;
        const dormCls = (dormColors[st.School]||dormColors.default).split(" ");
        div.classList.add(...dormCls);

        if(st.isLeft){
          div.classList.add("left");
          div.innerHTML+=`<span class="text-[9px] text-red-600 font-bold">ထွက်သွား</span>`;
        }else{
          div.classList.add("cursor-pointer","hover:scale-105");
          div.dataset.name=st.Name;
          div.addEventListener("click",cycleAttendanceState);
          div.addEventListener("mouseover",showTooltip);
          div.addEventListener("mouseout",hideTooltip);
          div.addEventListener("mousemove",moveTooltip);
        }
      }else{
        div.classList.add("empty");
        div.textContent=i;
      }
      grid.appendChild(div);
    }
    box.appendChild(grid);
    seatingChartContainer.appendChild(box);
  }
}

/* === Attendance === */
function cycleAttendanceState(e){
  const seat=e.currentTarget;
  if(seat.classList.contains("on-leave")){
    seat.classList.remove("on-leave"); seat.classList.add("absent");
  }else if(seat.classList.contains("absent")){
    seat.classList.remove("absent");
  }else{
    seat.classList.add("on-leave");
  }
  updateLists();
}

function updateLists(){
  updateList("absent", absentList, copyAbsentButton, "ပျက်ကွက်သူ မရှိပါ။");
  updateList("on-leave", onLeaveList, copyLeaveButton, "ခွင့်ရှိသူ မရှိပါ။");
}

function updateList(state, ul, btn, emptyMsg){
  ul.innerHTML="";
  const seats=document.querySelectorAll(`.seat.${state}`);
  if(!seats.length){
    ul.innerHTML=`<li class="text-gray-500">${emptyMsg}</li>`;
    btn.disabled=true; btn.classList.add("opacity-50");
  }else{
    btn.disabled=false; btn.classList.remove("opacity-50");
    [...seats].sort(sortSeats).forEach(seat=>{
      const li=document.createElement("li");
      li.className=`p-2 rounded ${state==="absent"?"bg-red-50 text-red-800":"bg-yellow-50 text-yellow-800"}`;
      li.textContent=`အတန်း ${seat.dataset.classNum}၊ ခုံ ${seat.dataset.seatNum}: ${seat.dataset.name}`;
      ul.appendChild(li);
    });
  }
}

function sortSeats(a,b){
  const ca=+a.dataset.classNum, cb=+b.dataset.classNum;
  const sa=+a.dataset.seatNum, sb=+b.dataset.seatNum;
  return ca===cb?sa-sb:ca-cb;
}

resetButton.addEventListener("click", ()=>{
  document.querySelectorAll(".seat").forEach(s=>s.classList.remove("absent","on-leave"));
  updateLists();
});

/* === Copy Lists === */
copyAbsentButton.addEventListener("click",()=>copyList("absent"));
copyLeaveButton.addEventListener("click",()=>copyList("on-leave"));

function copyList(state){
  const ul = state==="absent"?absentList:onLeaveList;
  const items=ul.querySelectorAll("li:not(.text-gray-500)");
  if(!items.length)return;

  let txt=`${state==="absent"?"ပျက်ကွက်စာရင်း":"ခွင့်စာရင်း"} (${getBurmeseDate()}):\n\n`;
  items.forEach(li=>txt+=li.textContent+"\n");
  navigator.clipboard.writeText(txt.trim());
}

/* === Tooltip === */
function showTooltip(e){ tooltip.textContent=e.target.dataset.name; tooltip.classList.remove("hidden"); }
function hideTooltip(){ tooltip.classList.add("hidden"); }
function moveTooltip(e){ tooltip.style.left=e.pageX+15+"px"; tooltip.style.top=e.pageY+15+"px"; }

/* === Burmese date === */
function getBurmeseDate(){
  const m=["ဇန်","ဖေ","မတ်","ဧပြီ","မေ","ဇွန်","ဇူ","ဩ","စက်","အောက်","နို","ဒီ"];
  const num=["၀","၁","၂","၃","၄","၅","၆","၇","၈","၉"];
  const toBM=n=>String(n).split("").map(d=>num[d]).join("");
  const d=new Date();
  return `${m[d.getMonth()]} ${toBM(d.getDate())} ရက်၊ ${toBM(d.getFullYear())}`;
}

/* === Admin Modal === */
adminPanelButton.addEventListener("click",()=>{
  const pw=prompt("Admin Password ထည့်ပါ:");
  if(pw==="Ashin@135") adminModal.classList.remove("hidden");
  else if(pw) alert("Password မှားနေသည်");
});
closeAdminModalButton.addEventListener("click",()=>adminModal.classList.add("hidden"));

/* CSV Download */
downloadCsvButton.addEventListener("click",()=>{
  const headers=["Class","Seat","Name","School","Left"];
  let csv=headers.join(",")+"\n";
  adminTableBody.querySelectorAll("tr").forEach(row=>{
    const vals=[...row.querySelectorAll("input")].map(input=>
      input.type==="checkbox"?input.checked:input.value);
    csv+=vals.map(v=>`"${v}"`).join(",")+"\n";
  });
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download="students_updated.csv";
  a.click();
});

/* === Helper for Admin Table === */
// သေးငယ်ချင်လို့ admin table logic များကို မဟုတ်ခင်သားပြန်ရေးထားတယ်
