import { CATEGORIES, GRAVITES, STATUTS } from "@/schemas/incident";

/**
 * Description OpenAPI 3.1 de l'API CrewDesk.
 *
 * Écrite à la main, volontairement : une génération automatique depuis le code
 * demanderait une dépendance de plus et des décorateurs partout. Ici, un seul
 * fichier lisible, servi tel quel sur /api/openapi et affiché sur /docs.
 *
 * Contrepartie : si tu ajoutes une route, pense à la décrire ici.
 */
export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "API CrewDesk",
    version: "1.0.0",
    description:
      "Gestion des incidents de la Station Horizon. " +
      "Toutes les routes sauf /api/auth/register vérifient le jeton à chaque appel : la signature, " +
      "l'expiration et l'existence du compte sont revalidées auprès de Supabase " +
      "(lib/garde.ts). Connecte-toi sur /login, le cookie de session suit automatiquement.",
  },
  servers: [{ url: "/", description: "Cette instance" }],
  tags: [
    { name: "Système", description: "Disponibilité et tests" },
    { name: "Authentification" },
    { name: "Incidents" },
    { name: "Équipage" },
    { name: "Utilisateurs MySQL", description: "CRUD de démonstration sur la base MySQL" },
  ],
  components: {
    securitySchemes: {
      // Supabase Auth range la session dans un cookie httpOnly.
      cookieSession: { type: "apiKey", in: "cookie", name: "sb-access-token" },
    },
    responses: {
      NonAuthentifie: {
        description: "Jeton absent, expiré ou invalide",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Erreur" } } },
      },
      Interdit: {
        description: "Authentifié mais rôle insuffisant",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Erreur" } } },
      },
    },
    schemas: {
      Erreur: {
        type: "object",
        properties: { error: { type: "string" } },
      },
      Membre: {
        type: "object",
        properties: {
          id_membre: { type: "integer" },
          user_id: { type: "string", format: "uuid", nullable: true },
          nom: { type: "string" },
          prenom: { type: "string" },
          role: { type: "string", enum: ["admin", "responsable", "technicien", "observateur"] },
          statut: { type: "string", enum: ["actif", "inactif"] },
          disponibilite: { type: "string", enum: ["disponible", "occupe", "repos", "absent"] },
        },
      },
      Incident: {
        type: "object",
        properties: {
          id_incident: { type: "integer" },
          titre: { type: "string" },
          description: { type: "string", nullable: true },
          categorie: { type: "string", enum: [...CATEGORIES] },
          gravite: { type: "string", enum: [...GRAVITES] },
          statut: { type: "string", enum: [...STATUTS] },
          date_creation: { type: "string", format: "date-time" },
          date_resolution: { type: "string", format: "date-time", nullable: true },
          id_membre_declarant: { type: "integer", nullable: true },
          id_membre_responsable: { type: "integer", nullable: true },
          id_zone: { type: "integer", nullable: true },
          id_equipement: { type: "integer", nullable: true },
        },
      },
      IncidentCreate: {
        type: "object",
        required: ["titre", "categorie"],
        properties: {
          titre: { type: "string", maxLength: 200 },
          description: { type: "string" },
          categorie: { type: "string", enum: [...CATEGORIES] },
          gravite: { type: "string", enum: [...GRAVITES], default: "mineure" },
          id_zone: { type: "integer", nullable: true },
          id_equipement: { type: "integer", nullable: true },
          id_membre_declarant: { type: "integer", nullable: true },
        },
      },
      UtilisateurMysql: {
        type: "object",
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
        },
      },
    },
  },
  security: [{ cookieSession: [] }],
  paths: {
    "/api/ping": {
      get: {
        tags: ["Système"],
        summary: "Test de vie",
        responses: {
          "200": { description: "pong" },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
    },
    "/api/health": {
      get: {
        tags: ["Système"],
        summary: "État des connexions MySQL et Supabase",
        responses: {
          "200": { description: "Tout est ok" },
          "503": { description: "Au moins une connexion est en erreur" },
        },
      },
    },
    "/api/echo": {
      post: {
        tags: ["Système"],
        summary: "Renvoie le message reçu",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message"],
                properties: { message: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "Écho" },
          "400": { description: "Corps invalide" },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentification"],
        summary: "Utilisateur connecté et sa fiche membre",
        responses: {
          "200": {
            description: "Session valide",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    identifiant: { type: "string" },
                    email: { type: "string" },
                    membre: { $ref: "#/components/schemas/Membre" },
                  },
                },
              },
            },
          },
          "401": {
            description: "Non authentifié",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Erreur" } } },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Authentification"],
        summary: "Créer un compte d'équipage",
        description:
          "Accepte un pseudo ou un email. Le compte est créé déjà confirmé : " +
          "aucun mail de vérification n'est envoyé. Le rôle est toujours " +
          "« technicien », il ne peut pas être choisi à l'inscription.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["identifiant", "motDePasse"],
                properties: {
                  identifiant: { type: "string", minLength: 3, maxLength: 50, example: "ferrand" },
                  motDePasse: { type: "string", minLength: 6, maxLength: 72 },
                  nom: { type: "string" },
                  prenom: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Compte créé" },
          "400": { description: "Identifiant ou mot de passe invalide" },
          "409": { description: "Identifiant déjà pris" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentification"],
        summary: "Ferme la session",
        responses: { "200": { description: "Déconnecté" } },
      },
    },
    "/api/incidents": {
      get: {
        tags: ["Incidents"],
        summary: "Liste des incidents",
        responses: {
          "200": {
            description: "Liste",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Incident" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Incidents"],
        summary: "Déclarer un incident",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/IncidentCreate" } },
          },
        },
        responses: {
          "201": {
            description: "Créé",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Incident" } },
            },
          },
          "400": { description: "Corps invalide" },
        },
      },
    },
    "/api/membres": {
      get: {
        tags: ["Équipage"],
        summary: "Liste des membres d'équipage",
        responses: {
          "200": {
            description: "Liste",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Membre" } },
              },
            },
          },
        },
      },
    },
    "/api/membres/{id}": {
      patch: {
        tags: ["Équipage"],
        summary: "Modifier un membre (rôle, statut, disponibilité)",
        description:
          "Réservé au rôle admin. Le jeton est vérifié côté serveur avant tout accès " +
          "à la base (lib/garde.ts).",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                minProperties: 1,
                properties: {
                  nom: { type: "string" },
                  prenom: { type: "string" },
                  role: {
                    type: "string",
                    enum: ["admin", "responsable", "technicien", "observateur"],
                  },
                  statut: { type: "string", enum: ["actif", "inactif"] },
                  disponibilite: {
                    type: "string",
                    enum: ["disponible", "occupe", "repos", "absent"],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Membre mis à jour",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Membre" } } },
          },
          "400": { description: "Corps invalide" },
          "401": { $ref: "#/components/responses/NonAuthentifie" },
          "403": { $ref: "#/components/responses/Interdit" },
          "404": { description: "Introuvable" },
        },
      },
    },
    "/api/users": {
      get: {
        tags: ["Utilisateurs MySQL"],
        summary: "Liste (base MySQL)",
        responses: {
          "200": {
            description: "Liste",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/UtilisateurMysql" } },
              },
            },
          },
        },
      },
      post: {
        tags: ["Utilisateurs MySQL"],
        summary: "Créer (base MySQL)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Créé" }, "400": { description: "Corps invalide" } },
      },
    },
    "/api/users/{id}": {
      delete: {
        tags: ["Utilisateurs MySQL"],
        summary: "Supprimer (base MySQL)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "integer" } },
        ],
        responses: { "200": { description: "Supprimé" }, "404": { description: "Introuvable" } },
      },
    },
  },
} as const;
