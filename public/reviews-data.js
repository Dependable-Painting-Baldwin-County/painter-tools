(function(){
  const raw = [
    { author: 'Mary Barnhill', body: 'Dependable Painting did a great job of transforming my house!! Outstanding paint job!!' },
    { author: 'Adam Lineberry', body: 'Contacted several painters for quotes and Dependable Painting LLC gave me the most reasonable one... They showed great attention to detail and their lines were razor sharp all throughout the house. They even went above and beyond and painted some spots my children left on the roof. On time, efficient, professional—highly recommend Alex and Megan!' },
    { author: 'Jeannie Bernardo', body: 'Very meticulous. My house has big dormers—no problem for them. It looks great and I am very pleased. Will use them again.' },
    { author: 'Gary Dunn', body: 'Professional and a pleasure to work with. Excellent work, on time each day and completed the job as promised.' },
    { author: 'Joseph Guarino', body: "Great working with Alex and his crew. Accommodating with scheduling and did a great job. We highly recommend and will use again." },
    { author: 'Sam Clunan', body: 'Very responsive. VERY trustworthy!' },
    { author: 'Bonnie Therrell', body: 'Very well pleased with the job they did.' },
    { author: 'Jeri Harrison', body: 'Excellent customer service, very professional staff, high quality of work. And DEPENDABLE like the name.' },
    { author: 'Kari Cramblitt', body: 'Wonderful experience! Very respectful and hardworking people. Will definitely be using them again.' },
    { author: 'Susan Turner', body: "They arrived when they said they would and the finished product was perfect. Highly recommend for any painting needs." },
    { author: 'Jena Cramblitt', body: 'Fantastic people! Went above and beyond—interior and exterior both look great. Will hire again.' },
    { author: 'Lisa Brunies', body: 'The name says it all—very dependable. Helped fix a mess left by another painter. Professional, polite, and skilled.' },
    { author: 'Loren Barraza', body: 'Absolutely fantastic and great communicators. Exterior looks amazing—fair pricing and quick turnaround.' },
    { author: 'Mary Godwin', body: 'Interior plus doors and porch—excellent work ethic, professional, punctual and personable.' },
    { author: 'kristmas1000', authorDisplay: 'Kristmas1000', body: 'Highly recommend. Fast, efficient, and walls look great.' },
    { author: 'Valery Smith', body: 'Incredible job. Extensive patch work + popcorn removal done perfectly. Prep, mud work, and finish all excellent.' },
    { author: 'Jane Penton', body: 'Used them twice—interior and exterior. Dependable, respectful, very pleased. Will use again.' },
    { author: 'Gina Lanaux', body: 'Easy to work with, highly professional, communicate well, fast and reasonable.' },
    { author: 'Patty Rowland', body: 'Whole interior repaint. Fast yet very good. Professional, respectful, neat—thrilled with the results.' }
  ];

  // Normalize (some reviewers may have alternate display casing)
  window.REVIEWS = raw.map(r => ({
    author: r.authorDisplay || r.author,
    body: r.body.trim(),
    rating: 5
  }));
})();
