export const DEDECO_ASSISTANT_SOURCES = Object.freeze({
  blood: {
    label: 'Ministério da Saúde — doação de sangue',
    url: 'https://www.gov.br/saude/pt-br/composicao/saes/doacao-de-sangue',
  },
  hemovida: {
    label: 'Hemovida — doação de sangue',
    url: 'https://www.gov.br/pt-br/servicos/consultar-o-guia-hemovida-para-obter-as-regras-para-doacao-de-sangue',
  },
  redome: {
    label: 'REDOME — cadastro e hemocentros',
    url: 'https://redome.inca.gov.br/doadores/',
  },
  redomeUpdate: {
    label: 'REDOME — atualizar cadastro',
    url: 'https://redome.inca.gov.br/atualize-seu-cadastro/',
  },
  inca: {
    label: 'INCA — perguntas sobre doação de medula',
    url: 'https://www.gov.br/inca/pt-br/acesso-a-informacao/perguntas-frequentes/doacao-de-medula-ossea/',
  },
  story: {
    label: 'Vídeo — Dedeco fala sobre a FlaMedula',
    url: 'https://www.youtube.com/watch?v=fHT9F5hqwKw',
  },
});

export const DEDECO_WHATSAPP_URL = 'https://wa.me/558599280682?text=Ol%C3%A1%2C%20FlaMedula!%20Vim%20pelo%20Dedeco%20Responde%20e%20preciso%20de%20orienta%C3%A7%C3%A3o.';

export const BLOOD_DONATION_GUIDANCE = [
  'Em geral, a doação de sangue é permitida dos 16 aos 69 anos. Menores de 18 anos precisam de autorização formal do responsável.',
  'É necessário pesar pelo menos 50 kg, apresentar documento oficial com foto, estar alimentado e ter dormido ao menos 6 horas.',
  'A decisão final é sempre da triagem do hemocentro. Condições de saúde, medicamentos, viagens e procedimentos recentes precisam ser avaliados pela equipe.',
];

export const MARROW_DONATION_GUIDANCE = [
  'Para fazer um novo cadastro no REDOME, é preciso ter entre 18 e 35 anos, estar em bom estado geral de saúde e apresentar documento oficial com foto.',
  'No hemocentro, a pessoa preenche o cadastro e autoriza a coleta de uma amostra de 5 ml de sangue para tipagem HLA.',
  'O cadastro permanece ativo no REDOME até os 60 anos. Manter telefone, endereço e e-mail atualizados é essencial.',
  'Cadastro não é doação imediata. Se houver possível compatibilidade, o REDOME entra em contato para novos exames e avaliação médica.',
];

export const HLA_GUIDANCE = [
  'HLA é a tipagem genética usada para procurar compatibilidade entre doador e paciente.',
  'Tipo sanguíneo e HLA são informações diferentes. Ser A, B, AB ou O não determina a compatibilidade de medula.',
  'Uma primeira compatibilidade ainda precisa ser confirmada por novos exames. A equipe médica orienta todas as etapas.',
];

export const AFTER_MATCH_GUIDANCE = [
  'Se aparecer uma possível compatibilidade, o REDOME entra em contato pelos dados cadastrados.',
  'São feitos novos exames para confirmar a compatibilidade e avaliar com segurança a saúde do doador.',
  'A forma de coleta é definida pela equipe médica conforme o caso e explicada antes de qualquer decisão.',
  'A doação é voluntária. Tire todas as dúvidas com a equipe responsável antes de confirmar.',
];

export const BRAZILIAN_STATES = [
  ['AC', 'Acre'],
  ['AL', 'Alagoas'],
  ['AP', 'Amapá'],
  ['AM', 'Amazonas'],
  ['BA', 'Bahia'],
  ['CE', 'Ceará'],
  ['DF', 'Distrito Federal'],
  ['ES', 'Espírito Santo'],
  ['GO', 'Goiás'],
  ['MA', 'Maranhão'],
  ['MT', 'Mato Grosso'],
  ['MS', 'Mato Grosso do Sul'],
  ['MG', 'Minas Gerais'],
  ['PA', 'Pará'],
  ['PB', 'Paraíba'],
  ['PR', 'Paraná'],
  ['PE', 'Pernambuco'],
  ['PI', 'Piauí'],
  ['RJ', 'Rio de Janeiro'],
  ['RN', 'Rio Grande do Norte'],
  ['RS', 'Rio Grande do Sul'],
  ['RO', 'Rondônia'],
  ['RR', 'Roraima'],
  ['SC', 'Santa Catarina'],
  ['SP', 'São Paulo'],
  ['SE', 'Sergipe'],
  ['TO', 'Tocantins'],
];
