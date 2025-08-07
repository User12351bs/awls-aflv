// Anime data - normally this would come from an API
        const animeData = [
            {
                id: 2,
                title: "Black Clover",
                image: "https://www3.animeflv.net/uploads/animes/covers/2806.jpg",
                inMyList: false,
                seasons: [
                    {
                        number: 1,
                        title: "Temporada 1",
                        episodes: 170,
                        slug: "black-clover-tv"
                    }
                ]
            },
            {
                id: 1,
                title: "Dandadan",
                image: "https://www3.animeflv.net/uploads/animes/covers/4056.jpg",
                inMyList: false,
                seasons: [
                    {
                        number: 1,
                        title: "Temporada 1",
                        episodes: 12,
                        slug: "dandadan" // Slug personalizado para esta temporada
                    },
                    {
                        number: 2,
                        title: "Temporada 2",
                        episodes: 6,
                        slug: "dandadan-2nd-season", // Slug personalizado para esta temporada
                        newEpisode: {
                            status: "Nuevo Episodio",
                            date: "2025-08-07"
                        }
                    }
                ]
            }
        ];

// Configuración global para todos los animes
const animeConfig = {
    defaultStatus: "pending",
    defaultLinks: {
        baseUrl: "https://www3.animeflv.net/ver/"
    }
};