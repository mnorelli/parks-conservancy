--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

SET search_path = public, pg_catalog;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: trailheads; Type: TABLE; Schema: public; Owner: ggnpc; Tablespace: 
--

CREATE TABLE trailheads (
    id integer NOT NULL,
    tnt_id integer,
    name character varying,
    geom geometry(Point, 900913) NOT NULL,
    CONSTRAINT trailheads_pkey PRIMARY KEY (id)
);


--
-- Name: trailheads_id_seq; Type: SEQUENCE; Schema: public; Owner: ggnpc
--

CREATE SEQUENCE trailheads_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trailheads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ggnpc
--

ALTER SEQUENCE trailheads_id_seq OWNED BY trailheads.id;


--
-- Name: id; Type: DEFAULT; Schema: public; Owner: ggnpc
--

ALTER TABLE ONLY trailheads ALTER COLUMN id SET DEFAULT nextval('trailheads_id_seq'::regclass);


--
-- Data for Name: trailheads; Type: TABLE DATA; Schema: public; Owner: ggnpc
--

COPY trailheads (id, tnt_id, name, geom) FROM stdin;
1	1249	Baker Beach	010100002031BF0D006BD5EB209A016AC1476049B5895B5141
2	1031	Baker Beach -  25th Ave	010100002031BF0D00B47967D6B7016AC1E4CFD05E285B5141
3	753	bay trail at gg bridge	010100002031BF0D00F5BA9C784E016AC1ED64FDC3F3605141
4	86	Bolinas Ridge: Rock Springs	010100002031BF0D00D1D331A0A4086AC13FD0CD7CCE6B5141
5	295	Bothin Marsh Open Space Preserve	010100002031BF0D001E01303155036AC1B00FDD5A82675141
6	2708	Capehart	010100002031BF0D008761BB409C026AC1FB91E46C9C615141
7	1526	China Beach	010100002031BF0D00CC55B67700026AC141AC854DCD5A5141
8	1527	Cliff House	010100002031BF0D00A8E2A29F45036AC12CA9561E8E595141
9	1034	Coastal Trail	010100002031BF0D009BAD2423210A6AC18C982FBCAC6D5141
10	906	Coastal Trail - Conzelman Rd	010100002031BF0D004E013C7B37026AC1085FBF6D32615141
11	1033	Coastal Trail - Ridgecrest Blvd	010100002031BF0D009DA3C927100A6AC1C834B58EB26D5141
12	505	College Drive - Sweeney Ridge	010100002031BF0D00D62A9C4A88006AC17EE0C397FD445141
13	298	Crissy Field - East Beach	010100002031BF0D005405A244EFFF69C110C0CBEC4A5D5141
14	548	Crissy Field Picnic Tables	010100002031BF0D00B78B2B2BD4006AC1E6AD1F577C5D5141
15	1528	Crissy Field - West Bluff	010100002031BF0D00BE5B44AEE6006AC16DF65EB0915D5141
16	1535	Dias Ridge	010100002031BF0D00147431C07D056AC1CBE156C63B685141
17	1154	Dias Ridge Trail	010100002031BF0D006ECAA2A78E066AC12D16A67275655141
18	1120	Dipsea Trailhead	010100002031BF0D00877E306D70056AC1DA959906FD6A5141
19	971	Dipsea Trail/Sun Trail	010100002031BF0D006586EF2BD4056AC15A8493A6E8695141
20	880	Donahue St	010100002031BF0D0020D03E6194036AC1995C7346EB665141
21	1017	Ecology Trail - Inspiration Point	010100002031BF0D009DDAB6C73D006AC129A2C95D715B5141
22	294	Fort Baker	010100002031BF0D00C1ABCD5D25016AC1DA628A1F82615141
23	397	Fort Funston	010100002031BF0D0097B8C9938C026AC18327B28568515141
24	1022	Fort Mason	010100002031BF0D00FF66B4C5B7FE69C166FB90980C5D5141
25	981	Fort Point	010100002031BF0D008ADF0B0840016AC105AB0DF4F75D5141
26	1204	Gerbode Valley	010100002031BF0D00D3DD523A9E036AC114E5D16BE0635141
27	1268	Golden Gate Bridge	010100002031BF0D00BB15A88227016AC1727D45B8955D5141
28	1294	Golden Gate Club, Presidio	010100002031BF0D00176F3C196F006AC12C6A91C98A5C5141
29	1534	Hawk Hill	010100002031BF0D006634BAB878026AC181010F4046605141
30	125	Huddart County Park: All-access Chickadee Trail	010100002031BF0D00E2F8401B2FF769C1F25A48EE212B5141
31	124	Huddart County Park: Into the Woods	010100002031BF0D005170C6A750F769C14B392BF7F02A5141
32	300	Inspiration Point, the Presidio	010100002031BF0D00ACAD8BFA3F006AC1D03BE4DD735B5141
33	1532	Kirby Cove	010100002031BF0D000DB50EE708026AC18B2179E154605141
34	1213	Lands End	010100002031BF0D002D96A33226036AC12390002CEC595141
35	299	LobosCreek Trail, the Presidio	010100002031BF0D004540BAC38A016AC17118C13AF55A5141
36	969	Lover's Lane	010100002031BF0D00EEB2F034ADFF69C1E957D8C26E5B5141
37	1592	Marina Green - America's Cup 2012	010100002031BF0D001BC5F2F80BFF69C10AB932E0745D5141
38	293	Marin Headlands - GG Bridge	010100002031BF0D00763969268C016AC10B9DA030FE605141
39	1015	Marin Headlands Visitor Center	010100002031BF0D0078986264DA036AC1E838ADF7C0605141
40	1121	McCurdy Trailhead	010100002031BF0D0031302C4FDD0D6AC11AC4EEC4C5705141
41	115	McNee Ranch State Park	010100002031BF0D005CBF20462F036AC168D946EDBC3A5141
42	513	Merrie Way Parking Lot - Sutro Baths	010100002031BF0D007D5A2F9226036AC1EA6EAB4CD1595141
43	405	Milagra Ridge	010100002031BF0D006966C0881E016AC117D764E0F1455141
44	995	Montara Mountain	010100002031BF0D004D8A014432036AC10E52C2B5FC3B5141
45	495	Montara State Beach - Montara	010100002031BF0D00189C55D548036AC1E0F0CB9F97395141
46	1129	Mori Point	010100002031BF0D002AE9CF3ECB016AC16EA48039AB435141
47	1030	Mountain Lake Park Trail	010100002031BF0D00F988ADCD02016AC128109E9FAE5A5141
48	1029	Mountain Lake Trail - Broadway Gate	010100002031BF0D0071FB41009CFF69C10855EFEE8E5B5141
49	1019	Mountain Lake Trail - Presidio Gate	010100002031BF0D007D3D1E2B3E006AC14363D7CD2B5B5141
50	437	Mount Tamalpais State Park: Matt Davis-Steep Ravine Loop	010100002031BF0D009E739B1F000A6AC1D69D8EEA3A6A5141
51	413	Mount Tamalpais State Park: Mountain Home	010100002031BF0D005FB13313B6066AC16257BBECB66B5141
52	343	Mount Tamalpais State Park: Muir Woods Road	010100002031BF0D00FCA7A6BB3A066AC180022B766B685141
53	87	Mount Tamalpais State Park: Pantoll	010100002031BF0D0055777BE42B086AC1E67D6A39D36A5141
54	436	Muir Beach	010100002031BF0D00F89B7B0A95066AC1EF4C010AE6645141
55	1255	Muir Beach Overlook	010100002031BF0D00C73A024534076AC13440A10E10655141
56	512	Muir Woods - Dipsea Trail	010100002031BF0D00E0E677DF3B066AC1354E1CB61B695141
57	970	Muir Woods National Monument	010100002031BF0D0043EAAAAD57066AC111799EF833695141
58	1466	Oakwood Valley	010100002031BF0D00AE8F645D02046AC1328BE85B2B665141
59	1483	Ocean Beach - Balboa Ave	010100002031BF0D00107A9B8A27036AC15970EC1A1D595141
60	497	Ocean Beach N Judah	010100002031BF0D0064484C1A10036AC190B6680C10575141
61	1484	Ocean Beach - Sloat Ave	010100002031BF0D0088C130B8E7026AC122F5E18BA6535141
62	1638	Old Colma Rd Trailhead	010100002031BF0D00555BE38B3B036AC1C636912A073F5141
63	1114	Orchard Fire Road	010100002031BF0D004DFF7F7B0C036AC1ABFDA0DABD655141
64	1012	Pacheco Fire Road	010100002031BF0D009E568EDD51036AC15E4B116B29665141
65	2738	Pedro Point Headlands: Green Gate Entrance	010100002031BF0D009F74D476D2026AC1C31ADF47113F5141
66	1155	Pelican Inn trailhead	010100002031BF0D0090D92CCE93066AC18E62DDD463655141
67	126	Phleger Estate	010100002031BF0D00F718ABA72CF769C164B9701E682B5141
68	1486	Point Bonita	010100002031BF0D0023EFC47024046AC128AF9CF6855F5141
69	1016	Presidio - Arguello Gate	010100002031BF0D005D33E8404D006AC18B7225E01F5B5141
70	1643	Presidio Coastal Trail - Merchant Road	010100002031BF0D00279454303D016AC16C77528B3B5D5141
71	1522	Presidio of San Francisco	010100002031BF0D00750256E039006AC1C5AC40BE155C5141
72	1153	Presidio Overlook - Washington Blvd	010100002031BF0D004E2EE5204F016AC17500C340015C5141
73	427	Purisima Creek Redwoods Open Space Preserve: All-access Redwood Trail	010100002031BF0D000AE94C8667F869C178B39B7BC3295141
74	118	Quarry Park	010100002031BF0D00D952A52E80006AC19F55DBBBCC335141
75	698	Rhubarb Trail	010100002031BF0D00116FD9DF0A046AC141AB683417665141
76	2751	Ridge Trail at Bolinas-Fairfax Road	010100002031BF0D00A67A40F9220B6AC10639CAFFBB6F5141
77	1524	Rocky Point	010100002031BF0D0020A83AC76A096AC113175C0F7E685141
78	301	Rodeo Beach/Fort Cronkhite	010100002031BF0D008B77E6C1A9046AC18F430AECF9605141
79	1627	Rodeo Trail - Rodeo Ave	010100002031BF0D0057F49964B3026AC19731F41EC8645141
80	302	Rodeo Valley Trail - Bunker Rd	010100002031BF0D00365A1DF12F036AC139A0091105615141
81	1257	Rodeo Valley Trail - Wolf Back Ridge	010100002031BF0D00D83781F042026AC1947F323F7C635141
82	398	San Pedro Valley Park: Brooks Falls	010100002031BF0D00FC8B5A9232016AC1F62129370D3E5141
83	400	San Pedro Valley Park: Valley View Loop	010100002031BF0D0054C099D71F016AC1962328B22B3E5141
84	1023	SF Maritime and Swimmer's Cove	010100002031BF0D00F51C274043FE69C1FC5EFC41985D5141
85	2750	Shoreline Highway Miwok Trailhead	010100002031BF0D000A3952F470056AC15AE257856E675141
86	508	Spencer Bus Pad - Morning Sun Trail	010100002031BF0D00453123F824026AC1A4CA1E54D4635141
87	1246	Stinson Beach	010100002031BF0D00808816D0300A6AC1D85CD58B066A5141
88	1231	Sutro Historic District	010100002031BF0D001D16B8A10C036AC1918E4738BD595141
89	986	Sweeney Ridge - Shelldance	010100002031BF0D00A4DCF56EB3016AC16ABFD5E794435141
90	401	Sweeney Ridge - Sneath Lane	010100002031BF0D0099B897F304006AC18E1FCDBAB6435141
91	499	Sweeny Ridge Road	010100002031BF0D00557B8C115D016AC14B8D567CFC405141
92	1028	Tennessee Hollow Trail	010100002031BF0D0071EAC0C500006AC1C09846874B5B5141
93	292	Tennessee Valley	010100002031BF0D006E2864AE76046AC1C0C1CEEEDF645141
94	1113	Tourist Club/Alice Eastwood Trail	010100002031BF0D00ED31487F31066AC1EA138296716A5141
95	641	Tourist Club Entrance	010100002031BF0D00AE20190130066AC10F0222C3226A5141
96	\N	Gullies Trail	010100002031BF0D00E599566303F769C116F80AED382C5141
97	\N	Sweeney Ridge Trail	010100002031BF0D0049DA2DC57CFF69C12CE4694351405141
98	\N	Sneath Lane Road	010100002031BF0D00ED8B02F440006AC13F9B689BDC415141
99	\N	Headlands Trailhead	010100002031BF0D0069DA5E9353026AC175CA8FBEC0435141
100	\N	Milagra Battery Trail	010100002031BF0D0038A1203BE9016AC1BB677B2DFB465141
101	\N	Chip Trail	010100002031BF0D00CBFB5A038A026AC1092A034BA5505141
102	\N	Coastal Trail	010100002031BF0D00D884D7B3A9026AC10D41E587CE505141
103	\N	Coastal Trail	010100002031BF0D00BDA0E43462076AC1E41A033124665141
104	\N	County View Road	010100002031BF0D002D641FC879046AC100D4471383665141
105	\N	Heather Cutoff Trail	010100002031BF0D00B3C6942201076AC19D6DDE9D03675141
106	\N	Rocky Point Trail	010100002031BF0D00A4FC84451D096AC12095BB58EF675141
107	\N	Homestead Fire Road	010100002031BF0D000D6A78A81A056AC1287F32ADCD685141
108	\N	Homestead Fire Road	010100002031BF0D007872E87E7F056AC1E6965B0DD8685141
109	\N	Four Corners	010100002031BF0D001259B14E9B056AC1656046086A695141
110	\N	Trailhead	010100002031BF0D009E8E7EFA28056AC1DCEFE795AF695141
111	\N	Matt Davis Trail	010100002031BF0D000B58D368B1086AC1BA177506226B5141
112	\N	Willow Camp Fire Road	010100002031BF0D00F5AB4D28EE0A6AC1E6307BF38D6B5141
113	\N	Bootjack Trail	010100002031BF0D0063447C4B0B086AC1287E9812926B5141
114	\N	Coastal Trail	010100002031BF0D009CFE1009C00A6AC1196F6210306F5141
115	\N	Randall Trail	010100002031BF0D0070B8B2050B0F6AC1C44BB8A959745141
\.


--
-- Name: trailheads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ggnpc
--

SELECT pg_catalog.setval('trailheads_id_seq', 115, true);


--
-- PostgreSQL database dump complete
--

