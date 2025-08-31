// contact-form.js - handles contact/estimate form submission

async function submitContactForm(formSelector, options = {}) {
	const form = document.querySelector(formSelector);
	if (!form) return;
	form.addEventListener('submit', async function(e) {
		e.preventDefault();
		const data = {};
		for (const el of form.elements) {
			if (el.name && !el.disabled) data[el.name] = el.value;
		}
		// Optionally add UTM/session info
		data.utm_source = localStorage.getItem('utm_source') || '';
		data.utm_medium = localStorage.getItem('utm_medium') || '';
		data.utm_campaign = localStorage.getItem('utm_campaign') || '';
		data.gclid = localStorage.getItem('gclid') || '';
		data.session = localStorage.getItem('session_id') || '';
		try {
			const res = await fetch('/api/estimate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			const result = await res.json();
			if (res.ok && result.success) {
				if (result.redirect) {
					window.location.href = result.redirect;
				} else if (options.onSuccess) {
					options.onSuccess(result);
				} else {
					alert('Thank you! We received your request.');
				}
			} else {
				if (options.onError) {
					options.onError(result);
				} else {
					alert(result.error || 'Submission failed. Please try again.');
				}
			}
		} catch (err) {
			if (options.onError) {
				options.onError({ error: err.message });
			} else {
				alert('Submission failed. Please try again.');
			}
		}
	});
}

// Usage example:
// submitContactForm('#contact-form');
