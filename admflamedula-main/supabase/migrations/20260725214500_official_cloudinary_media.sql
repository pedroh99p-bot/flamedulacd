-- Moves the seeded public content to the official FlaMedula Cloudinary cloud.
-- The public frontend also maps legacy URLs during the transition, so this
-- migration can be deployed independently without a broken-image window.

update public.hero_news
set image_url = case title
  when '15 de junho agora é o Dia do FlaMedula'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_1920,h_1080,f_auto,q_auto/v1785019387/c46f2575-bd3e-429d-8831-b9d9da5ad3a8_2_mevfxh.jpg'
  when 'Filha doa medula para o pai'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_1920,h_1080,f_auto,q_auto/v1785019388/af5b390a-4e86-4737-aaeb-af6daf55b04e_1_e3y7ro.jpg'
  when 'Rafael VENCEU!!!'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_1920,h_1080,f_auto,q_auto/v1785019389/341c873e-d4f5-403c-a589-b6a72287dfde_1_qpe934.jpg'
  else image_url
end
where title in (
  '15 de junho agora é o Dia do FlaMedula',
  'Filha doa medula para o pai',
  'Rafael VENCEU!!!'
);

update public.actions
set image_url = case title
  when 'Dia das Mães Solidário'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_960,h_640,f_auto,q_auto/v1785019195/Um_Dia_das_M%C3%A3es_de_colo_abra%C3%A7o_e_esperan%C3%A7a_Hospital_Pedro_Ernesto_-_RJ._%EF%B8%8F_Hoje_a_nossa_a%C3%A7%C3%A3o_fo_rv6cqx.jpg'
  when 'Apoio e Cuidado'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_960,h_640,f_auto,q_auto/v1785019197/Um_Dia_das_M%C3%A3es_de_colo_abra%C3%A7o_e_esperan%C3%A7a_Hospital_Pedro_Ernesto_-_RJ._%EF%B8%8F_Hoje_a_nossa_a%C3%A7%C3%A3o_fo_1_bfije5.jpg'
  when 'Força para as Mães'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_960,h_640,f_auto,q_auto/v1785019194/Dia_das_M%C3%A3es_1_cina39.jpg'
  when 'Cadastro e Esperança'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_960,h_640,f_auto,q_auto/v1785019194/Dia_das_M%C3%A3es_xykeac.jpg'
  when 'Páscoa com Carinho'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_960,h_640,f_auto,q_auto/v1785019202/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_1_ilu1ux.jpg'
  when 'Momentos de Leveza'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_960,h_640,f_auto,q_auto/v1785019197/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_wtralw.jpg'
  when 'Corrente do Bem'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_auto,w_960,h_640,f_auto,q_auto/v1785019198/P%C3%A1scoa_do_INCA_-_Instituto_Nacional_do_C%C3%A2ncer_elainereixach_gabrielebachcosplayharley_incavol_2_hig7dq.jpg'
  else image_url
end
where title in (
  'Dia das Mães Solidário',
  'Apoio e Cuidado',
  'Força para as Mães',
  'Cadastro e Esperança',
  'Páscoa com Carinho',
  'Momentos de Leveza',
  'Corrente do Bem'
);

update public.team_members
set image_url = case name
  when 'André Matos "Dedeco"'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018666/1_1_1_a86ew6.jpg'
  when 'Décio Simões'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018593/ef619f36-3ef9-4dd0-ae16-adced1b8bb79_1_fqcw1v.jpg'
  when 'Ariela Mesquita'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018594/678ecd31-e992-47dd-a000-46b1d67653ba_1_syrnyg.jpg'
  when 'Michel Mesquita'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018596/a75db0ec-e228-4d8f-b9f4-b3c2dae868cb_1_jcey1x.jpg'
  when 'Carlos André'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018657/e5701f89-a6fe-4b42-a12a-7c8f3240596d_1_cnpn5a.jpg'
  when 'Silvio Murilo'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018659/92fbf70c-efd1-49f8-b1c8-f29a76a4506f_1_ipr8o3.jpg'
  when 'Antonio Artur'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018986/e94d33ef-ea50-464e-870c-818b7ad53e29_wpgnki.jpg'
  when 'Zico'
    then 'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018665/77db4a91-4d28-4883-822f-b755ab31f1bf_1_pzdqap.jpg'
  else image_url
end
where name in (
  'André Matos "Dedeco"',
  'Décio Simões',
  'Ariela Mesquita',
  'Michel Mesquita',
  'Carlos André',
  'Silvio Murilo',
  'Antonio Artur',
  'Zico'
);

insert into public.team_members (
  name,
  role,
  description,
  member_type,
  image_url,
  image_alt,
  published,
  sort_order,
  published_at
)
select
  'Antonio Artur',
  null,
  null,
  'equipe',
  'https://res.cloudinary.com/dhbrxzt5a/image/upload/c_fill,g_face,w_640,h_640,f_auto,q_auto/v1785018986/e94d33ef-ea50-464e-870c-818b7ad53e29_wpgnki.jpg',
  'Foto de Antonio Artur',
  true,
  7,
  now()
where not exists (
  select 1
  from public.team_members
  where lower(name) = lower('Antonio Artur')
);
