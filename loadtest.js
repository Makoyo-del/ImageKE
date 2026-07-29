import autocannon from 'autocannon';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:5000/api/analyze-resume';

console.log(`\n======================================================`);
console.log(`  ATS SIMULATOR — HIGH CONCURRENCY LOAD TEST`);
console.log(`  Target Endpoint : ${TARGET_URL}`);
console.log(`  Simulated Rate  : 100 requests / 60 seconds`);
console.log(`======================================================\n`);

const mockPayload = JSON.stringify({
  fileType: 'pdf',
  text: `
    DUNCAN MAKOYO | SENIOR SOFTWARE ENGINEER
    Email: info@duncanmakoyo.com | Phone: +254712345678 | Location: Nairobi, Kenya
    LinkedIn: linkedin.com/in/duncanmakoyo

    PROFESSIONAL SUMMARY
    Senior Full-Stack Engineer with 8+ years of experience building high-scale web applications, microservices, and AI integrations.

    CORE SKILLS
    JavaScript, TypeScript, Python, React, Node.js, Express, PostgreSQL, Supabase, AWS, Docker, Kubernetes, GraphQL, REST APIs, CI/CD, Agile.

    PROFESSIONAL EXPERIENCE
    Senior Full-Stack Engineer | Tech Solutions Inc. | 2021 - Present
    • Engineered enterprise microservices using Node.js and React, increasing system throughput by 45%.
    • Implemented automated CI/CD pipelines reducing deployment downtime by 80%.
    • Led a team of 6 engineers to deliver modern SaaS architecture on time and under budget.

    Software Developer | Global Fintech | 2018 - 2021
    • Developed payment integration modules handling over $5M in monthly transactions.
    • Optimized database queries cutting P99 latency from 800ms to 45ms.

    EDUCATION
    BSc in Computer Science | University of Nairobi | 2014 - 2018
  `,
  extractedLinks: [
    'https://linkedin.com/in/duncanmakoyo',
    'https://duncanmakoyo.com'
  ]
});

function runLoadTest() {
  const instance = autocannon({
    url: TARGET_URL,
    connections: 10,       // 10 concurrent connections
    duration: 60,          // 60 seconds duration
    amount: 100,           // Total 100 requests target
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: mockPayload
  }, (err, result) => {
    if (err) {
      console.error('❌ Load test failed to execute:', err);
      process.exit(1);
    }
    
    console.log('\n✅ Load Test Completed Successfully!');
    console.log('------------------------------------------------------');
    console.log(`Total Requests Sent : ${result.requests.total}`);
    console.log(`2xx Success Responses: ${result['2xx'] || 0}`);
    console.log(`4xx / Rate Limited  : ${result['4xx'] || 0}`);
    console.log(`5xx Server Errors   : ${result['5xx'] || 0}`);
    console.log(`Average Latency     : ${result.latency.average} ms`);
    console.log(`Throughput (Req/sec): ${result.requests.average}`);
    console.log('------------------------------------------------------\n');
  });

  autocannon.track(instance, { renderProgressBar: true });
}

runLoadTest();
