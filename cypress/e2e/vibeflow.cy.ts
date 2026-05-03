// FILE: cypress/e2e/vibeflow.cy.ts
// Cypress e2e tests — full user journey: login → journal entry → mood detection → dashboard.
// Requires both backend (port 4000) and frontend (port 3000) running.
// Run with: npx cypress run   OR   npx cypress open (interactive)

describe('VibeFlow — Full User Journey', () => {
  const BASE = 'http://localhost:3000';

  // ── 1. Login page ───────────────────────────────────────────────────────────
  describe('Login Page', () => {
    it('loads the login page', () => {
      cy.visit(`${BASE}/login`);
      cy.get('h1, h2').should('contain.text', 'VibeFlow');
    });

    it('shows the Google sign-in button', () => {
      cy.visit(`${BASE}/login`);
      cy.get('[id*="google"], a[href*="google"], button')
        .contains(/google|sign in/i)
        .should('be.visible');
    });

    it('redirects unauthenticated users from /dashboard to /login', () => {
      cy.visit(`${BASE}/dashboard`, { failOnStatusCode: false });
      cy.url().should('include', '/login');
    });
  });

  // ── 2. Mood entry ───────────────────────────────────────────────────────────
  describe('Mood Entry Flow (with stubbed auth)', () => {
    beforeEach(() => {
      // Stub the /auth/me endpoint to simulate a logged-in user
      cy.intercept('GET', '**/auth/me', {
        statusCode: 200,
        body: { user: { id: 'test-1', name: 'Dipesh', email: 'test@vibeflow.app', avatar_url: null } },
      }).as('authMe');

      // Stub streaks
      cy.intercept('GET', '**/api/streaks', {
        statusCode: 200,
        body: { streak: { current_streak: 5, longest_streak: 14, dominant_mood: 'focused' } },
      }).as('streaks');
    });

    it('renders the mood questionnaire on /mood', () => {
      cy.visit(`${BASE}/mood`);
      cy.wait('@authMe');
      cy.get('form, [role="form"], [data-testid="questionnaire"]').should('exist');
    });

    it('persists selected mood to localStorage on submit', () => {
      cy.visit(`${BASE}/mood`);
      cy.wait('@authMe');
      // Select the first mood option (happy) and submit
      cy.get('[id*="mood"], input[type="radio"], button[aria-label*="Happy"]').first().click({ force: true });
      cy.get('button[type="submit"], button').contains(/submit|done|save|continue/i).click({ force: true });
      cy.window().then((win) => {
        expect(win.localStorage.getItem('vf_active_mood')).not.to.be.null;
      });
    });
  });

  // ── 3. Dashboard ────────────────────────────────────────────────────────────
  describe('Dashboard (with stubbed auth)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/auth/me', {
        statusCode: 200,
        body: { user: { id: 'test-1', name: 'Dipesh', email: 'test@vibeflow.app', avatar_url: null } },
      }).as('authMe');
      cy.intercept('GET', '**/api/streaks', {
        statusCode: 200,
        body: { streak: { current_streak: 5, longest_streak: 14, dominant_mood: 'focused' } },
      }).as('streaks');
      cy.intercept('GET', '**/api/tasks', {
        statusCode: 200,
        body: { tasks: [
          { id: '1', title: 'Finish VibeFlow Phase 6', status: 'pending', created_at: new Date().toISOString() },
        ]},
      }).as('tasks');
      cy.intercept('GET', '**/api/spotify/token', {
        statusCode: 200, body: { connected: false },
      }).as('spotifyToken');
      cy.window().then((win) => win.localStorage.setItem('vf_active_mood', 'focused'));
    });

    it('renders the dashboard with Focus Session and Task Breeze panels', () => {
      cy.visit(`${BASE}/dashboard`);
      cy.wait('@authMe');
      cy.get('#pomodoro-heading, [id*="pomodoro"]').should('exist');
      cy.get('#tasks-heading, [id*="tasks"]').should('exist');
    });

    it('shows the streak count in the header', () => {
      cy.visit(`${BASE}/dashboard`);
      cy.wait('@authMe');
      cy.wait('@streaks');
      cy.contains('5d').should('be.visible');
    });

    it('shows the Spotify connect CTA when not connected', () => {
      cy.visit(`${BASE}/dashboard`);
      cy.wait('@authMe');
      cy.wait('@spotifyToken');
      cy.get('#spotify-connect-cta, #spotify-connect-btn')
        .should('exist');
    });

    it('renders tasks from the API', () => {
      cy.visit(`${BASE}/dashboard`);
      cy.wait('@tasks');
      cy.contains('Finish VibeFlow Phase 6').should('be.visible');
    });

    it('can navigate to analytics page', () => {
      cy.visit(`${BASE}/dashboard`);
      cy.wait('@authMe');
      cy.get('#analytics-btn').click();
      cy.url().should('include', '/analytics');
    });

    it('can navigate back to mood entry', () => {
      cy.visit(`${BASE}/dashboard`);
      cy.wait('@authMe');
      cy.get('#change-mood-btn').click();
      cy.url().should('include', '/mood');
    });
  });

  // ── 4. Analytics page ───────────────────────────────────────────────────────
  describe('Analytics Page (with stubbed auth)', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/auth/me', {
        statusCode: 200,
        body: { user: { id: 'test-1', name: 'Dipesh', email: 'test@vibeflow.app', avatar_url: null } },
      }).as('authMe');
      cy.intercept('GET', '**/api/sessions', {
        statusCode: 200,
        body: { daily_summary: [
          { date: new Date().toISOString().slice(0, 10), total_minutes: 50, session_count: 2 },
        ]},
      }).as('sessions');
      cy.intercept('GET', '**/api/streaks', {
        statusCode: 200,
        body: { streak: { current_streak: 5, longest_streak: 14, dominant_mood: 'focused' } },
      }).as('streaks');
    });

    it('renders the analytics heading', () => {
      cy.visit(`${BASE}/analytics`);
      cy.contains(/flow analytics/i).should('be.visible');
    });

    it('shows KPI tiles with session data', () => {
      cy.visit(`${BASE}/analytics`);
      cy.wait('@sessions');
      cy.contains('Total sessions').should('be.visible');
      cy.contains('Focus minutes').should('be.visible');
    });

    it('has a back to dashboard link', () => {
      cy.visit(`${BASE}/analytics`);
      cy.get('#analytics-back-btn').click();
      cy.url().should('include', '/dashboard');
    });
  });
});
