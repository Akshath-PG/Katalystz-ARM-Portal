export default function GradeComparisonTable() {
  const gradesData = [
    { grade: "Grade 10-A", syllabus: "85%", attendance: "92%", avgScore: "78%", status: "On Track" },
    { grade: "Grade 10-B", syllabus: "78%", attendance: "88%", avgScore: "72%", status: "Needs Attention" },
    { grade: "Grade 11-Science", syllabus: "92%", attendance: "96%", avgScore: "85%", status: "Excellent" },
    { grade: "Grade 11-Commerce", syllabus: "88%", attendance: "94%", avgScore: "82%", status: "On Track" },
    { grade: "Grade 12-Arts", syllabus: "70%", attendance: "85%", avgScore: "68%", status: "Needs Attention" },
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-8">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Grade Comparison Table</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 rounded-tl-lg">Grade / Class</th>
              <th scope="col" className="px-6 py-3">Syllabus Completion</th>
              <th scope="col" className="px-6 py-3">Average Attendance</th>
              <th scope="col" className="px-6 py-3">Avg. Assessment Score</th>
              <th scope="col" className="px-6 py-3 rounded-tr-lg">Status</th>
            </tr>
          </thead>
          <tbody>
            {gradesData.map((data, index) => (
              <tr key={index} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{data.grade}</td>
                <td className="px-6 py-4">{data.syllabus}</td>
                <td className="px-6 py-4">{data.attendance}</td>
                <td className="px-6 py-4">{data.avgScore}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    data.status === "Excellent" ? "bg-green-100 text-green-800" :
                    data.status === "On Track" ? "bg-blue-100 text-blue-800" :
                    "bg-red-100 text-red-800"
                  }`}>
                    {data.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
